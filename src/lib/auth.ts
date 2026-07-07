import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username / Register No", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            throw new Error("Missing register number or password");
          }

          const usernameTrimmed = credentials.username.trim().toLowerCase();

          // Admin check
          if (usernameTrimmed === "admin") {
            let adminUser = await prisma.user.findUnique({
              where: { registerNo: "admin" },
            });
            if (!adminUser) {
              // Seed default admin: admin123
              const hashedPassword = bcrypt.hashSync("admin123", 10);
              adminUser = await prisma.user.create({
                data: {
                  registerNo: "admin",
                  name: "Department Administrator",
                  password: hashedPassword,
                  role: "ADMIN",
                },
              });
            }
            const isValid = bcrypt.compareSync(credentials.password, adminUser.password);
            if (!isValid) {
              throw new Error("Incorrect admin password");
            }
            return {
              id: adminUser.id,
              name: adminUser.name,
              email: adminUser.registerNo,
              role: adminUser.role,
            };
          }

          // Student check
          const student = await prisma.user.findUnique({
            where: { registerNo: credentials.username.trim() },
          });

          if (!student) {
            throw new Error("No student found with this register number");
          }

          const isPasswordValid = bcrypt.compareSync(credentials.password, student.password);

          if (!isPasswordValid) {
            throw new Error("Incorrect password");
          }

          return {
            id: student.id,
            name: student.name,
            email: student.registerNo,
            role: student.role,
          };
        } catch (error) {
          console.error("AUTHORIZE ERROR:", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.registerNo = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).registerNo = token.registerNo;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only-123456",
};
