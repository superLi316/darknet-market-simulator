import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@darknet.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminUsername = process.env.ADMIN_USERNAME || "admin";

  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (existingAdmin) {
    console.log("管理员账号已存在:", adminUsername);
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.create({
    data: {
      username: adminUsername,
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
      personality: "CAUTIOUS",
      balance: 999999,
    },
  });

  console.log("管理员账号创建成功:");
  console.log("  用户名:", admin.username);
  console.log("  邮箱:", admin.email);
  console.log("  角色:", admin.role);
}

main()
  .catch((e) => {
    console.error("创建管理员账号失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
