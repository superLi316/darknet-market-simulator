import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { UserRole, PlayerStatus, PersonalityType } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: UserRole;
      status: PlayerStatus;
      personality: PersonalityType;
      email?: string;
      name?: string;
      image?: string;
    };
  }

  interface User {
    username: string;
    role: UserRole;
    status: PlayerStatus;
    personality: PersonalityType;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    username: string;
    role: UserRole;
    status: PlayerStatus;
    personality: PersonalityType;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            username: credentials.username as string,
          },
        });

        if (!user) {
          return null;
        }

        const passwordValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordValid) {
          return null;
        }

        if (user.status === "BANNED") {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          email: user.email || undefined,
          role: user.role as UserRole,
          status: user.status as PlayerStatus,
          personality: user.personality as PersonalityType,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user && user.id) {
        token.userId = user.id;
        token.username = user.username;
        token.role = user.role;
        token.status = user.status;
        token.personality = user.personality;
      }

      if (trigger === "update" && session) {
        return { ...token, ...session };
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.personality = token.personality;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});
