import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

export const userTable = sqliteTable('users', {
    id: text('id').notNull().primaryKey(),
    provider: text('provider').notNull().default('email'),
    providerId: text('provider_id').notNull().default(''),
    email: text('email').notNull().unique(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    role: text('role').notNull().default('USER'),
    verified: integer('verified', { mode: 'boolean' }).notNull().default(false),
    receiveEmail: integer('receive_email', { mode: 'boolean' }).notNull().default(true),
    password: text('password'),
    token: text('token').unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

export const sessionTable = sqliteTable("session", {
	id: text("id").primaryKey(),
	userId: text("user_id")
	  .notNull()
	  .references(() => userTable.id),
	expiresAt: integer("expires_at", { mode: "timestamp" }).notNull()
  });

export type User = typeof userTable.$inferInsert;
export type UpdateUser = Partial<typeof userTable.$inferInsert>;
export type Session = typeof sessionTable.$inferInsert;
