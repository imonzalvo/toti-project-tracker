/**
 * Prueba de aislamiento cross-tenant (plan §8-E). Corre contra la base que
 * apunte DATABASE_URL — por eso exige una confirmación explícita.
 *
 * NUNCA correr contra producción: crea y borra un tenant de prueba, y sondea
 * IDOR contra el primer tenant real que encuentre en la base.
 *
 * Uso:
 *   CONFIRM_NOT_PROD=si npm run verify:isolation
 */
import { db } from "~/server/db";
import { createCaller } from "~/server/api/root";
import type { AuthUser } from "~/server/api/trpc";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

if (process.env.CONFIRM_NOT_PROD !== "si") {
  console.error(
    "Abortado: seteá CONFIRM_NOT_PROD=si para confirmar que DATABASE_URL " +
      "NO apunta a producción. Este script escribe y borra datos.",
  );
  process.exit(1);
}

function callerAs(user: AuthUser) {
  return createCaller({
    db,
    // El router de datos nunca toca session directamente (solo auth.login/logout
    // lo hacen, y no se ejercitan acá), así que un stub alcanza.
    session: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      save: async () => {},
      destroy: () => {},
    } as never,
    getAuthUser: async () => user,
    headers: new Headers(),
  });
}

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    console.error(`  ✗ ${label}`);
    failures++;
  }
}

async function expectNotFound(label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(label, false);
  } catch (e) {
    check(label, e instanceof TRPCError && e.code === "NOT_FOUND");
  }
}

async function main() {
  console.log("=== Setup: tenant A (real) y tenant B (de prueba) ===");

  const tenantARoot = await db.user.findFirst({ where: { ownerId: null } });
  if (!tenantARoot) throw new Error("No hay ningún tenant raíz en la base; nada que probar.");
  const proyectoA = await db.proyecto.findFirst({ where: { ownerId: tenantARoot.id } });
  if (!proyectoA) throw new Error("El tenant A no tiene proyectos; nada que probar.");
  const miembroA = await db.user.findFirst({ where: { ownerId: tenantARoot.id } });

  const tenantBRoot = await db.user.create({
    data: {
      email: `verify-isolation-${Date.now()}@test.local`,
      password: await bcrypt.hash("test-password", 10),
      name: "Tenant B (test)",
      role: "ADMIN",
      ownerId: null,
    },
  });

  const asA: AuthUser = { ...tenantARoot, role: tenantARoot.role as "ADMIN" | "GUEST" };
  const asB: AuthUser = { ...tenantBRoot, role: "ADMIN" };
  const callerA = callerAs(asA);
  const callerB = callerAs(asB);

  try {
    console.log(`\n=== IDOR: B contra el proyecto ${proyectoA.identificador} de A ===`);
    await expectNotFound("getById", () => callerB.proyecto.getById({ id: proyectoA.id }));
    await expectNotFound("update", () =>
      callerB.proyecto.update({ id: proyectoA.id, nombre: "pwned" }),
    );
    await expectNotFound("delete", () => callerB.proyecto.delete({ id: proyectoA.id }));
    await expectNotFound("facturacion.create cross-tenant", () =>
      callerB.facturacion.create({
        proyectoId: proyectoA.id,
        descripcion: "APROBACION",
        porcentaje: 10,
        fechaFacturacion: new Date(),
      }),
    );

    const proyectoASigueIgual = await db.proyecto.findUnique({ where: { id: proyectoA.id } });
    check("A no fue modificado", proyectoASigueIgual?.nombre === proyectoA.nombre);

    if (miembroA) {
      console.log(`\n=== IDOR: B contra usuarios de A ===`);
      await expectNotFound("deleteUser cross-tenant", () =>
        callerB.auth.deleteUser({ id: miembroA.id }),
      );
      await expectNotFound("updateUserPassword cross-tenant", () =>
        callerB.auth.updateUserPassword({ id: miembroA.id, password: "otra-clave" }),
      );
      const sigueExistiendo = await db.user.findUnique({ where: { id: miembroA.id } });
      check("miembro de A no fue tocado", sigueExistiendo !== null);
    }

    console.log("\n=== Único por tenant: B puede reusar el identificador de A ===");
    const nuevoProyectoB = await callerB.proyecto.create({
      identificador: proyectoA.identificador,
      nombre: "Proyecto de prueba B",
      montoTotal: 1000,
      comisionPct: 10,
      moneda: "USD",
    });
    check("creó proyecto con identificador duplicado (de otro tenant)", !!nuevoProyectoB.id);

    let duplicadoEnB = false;
    try {
      await callerB.proyecto.create({
        identificador: proyectoA.identificador,
        nombre: "Duplicado dentro de B",
        montoTotal: 1,
        comisionPct: 1,
        moneda: "USD",
      });
    } catch (e) {
      duplicadoEnB = e instanceof TRPCError && e.code === "CONFLICT";
    }
    check("rechaza duplicado DENTRO del mismo tenant", duplicadoEnB);

    console.log("\n=== Fuga por agregados: B no ve números de A ===");
    const statsB = await callerB.proyecto.getStats({ moneda: "USD" });
    check("getStats.totalProyectos === 1 (solo el propio)", statsB.totalProyectos === 1);

    const listaB = await callerB.proyecto.getAll({ moneda: "USD" });
    check("getAll devuelve solo el proyecto propio", listaB.length === 1 && listaB[0]?.id === nuevoProyectoB.id);

    console.log("\n=== auth.getUsers: A sigue viéndose a sí misma (raíz ownerId=null) ===");
    const usersA = await callerA.auth.getUsers();
    check("la raíz aparece en su propia lista de usuarios", usersA.some((u) => u.id === tenantARoot.id));
  } finally {
    console.log("\n=== Cleanup: borrando tenant B de prueba ===");
    await db.facturacion.deleteMany({ where: { ownerId: tenantBRoot.id } });
    await db.proyecto.deleteMany({ where: { ownerId: tenantBRoot.id } });
    await db.user.delete({ where: { id: tenantBRoot.id } });
  }

  console.log(failures === 0 ? "\n✅ Todo OK" : `\n❌ ${failures} check(s) fallaron`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
