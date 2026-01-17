import { type NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import bcrypt from "bcryptjs";
import { db } from "~/server/db";
import { sessionOptions, type SessionData } from "~/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email: string; password: string; name: string };
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, contraseña y nombre requeridos" },
        { status: 400 }
      );
    }

    // Verificar que no exista ningún admin
    const adminCount = await db.user.count({
      where: { role: "ADMIN" },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Ya existe un administrador registrado" },
        { status: 403 }
      );
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el admin
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "ADMIN",
      },
    });

    // Crear respuesta y obtener sesión
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as "ADMIN" | "GUEST",
    };
    await session.save();

    console.log("[AUTH API] Setup successful for:", user.email);

    return response;
  } catch (error) {
    console.error("[AUTH API] Setup error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
