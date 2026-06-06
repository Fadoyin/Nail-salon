import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma.js";
import { signUserToken } from "../lib/jwt.js";
import { AppError } from "../lib/errors.js";
import { getInitials } from "../utils/initials.js";
import { createWelcomeNotification } from "./notification.service.js";
import { createAdminNotification } from "./admin-notification.service.js";

const SALT_ROUNDS = 12;

export function formatUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    initials: getInitials(user.firstName, user.lastName),
    createdAt: user.createdAt.toISOString(),
  };
}

export async function registerUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const email = input.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError(409, "Email already registered", "EMAIL_EXISTS");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
    },
  });

  await createWelcomeNotification(user.id, user.firstName);
  await createAdminNotification({
    type: "NEW_CLIENT",
    title: "New client registered",
    message: `${user.firstName} ${user.lastName} (${user.email}) created an account`,
    userId: user.id,
    linkPath: `/admin?section=clients&id=${user.id}`,
  });

  const token = signUserToken(user.id, user.email);

  return {
    user: formatUser(user),
    token,
    message: "Account created successfully! Welcome to Dollhouse Lounge 🌸",
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const token = signUserToken(user.id, user.email);

  return {
    user: formatUser(user),
    token,
  };
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "User not found");
  }
  return formatUser(user);
}

export async function updateUserProfile(
  userId: string,
  input: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    newPassword?: string;
  }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (input.email && input.email.toLowerCase() !== user.email) {
    const taken = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (taken) {
      throw new AppError(409, "Email already registered", "EMAIL_EXISTS");
    }
  }

  const data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    passwordHash?: string;
  } = {};

  if (input.firstName) data.firstName = input.firstName.trim();
  if (input.lastName) data.lastName = input.lastName.trim();
  if (input.email) data.email = input.email.toLowerCase();
  if (input.phone) data.phone = input.phone.trim();
  if (input.newPassword) {
    data.passwordHash = await bcrypt.hash(input.newPassword, SALT_ROUNDS);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return {
    user: formatUser(updated),
    message: "Profile updated successfully",
  };
}
