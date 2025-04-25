import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum definitions
export const ticketStatusEnum = pgEnum('ticket_status', [
  'open',
  'in_progress',
  'pending',
  'resolved',
  'closed'
]);

export const ticketPriorityEnum = pgEnum('ticket_priority', [
  'low',
  'medium',
  'high',
  'critical'
]);

export const ticketCategoryEnum = pgEnum('ticket_category', [
  'technical_support',
  'financial',
  'commercial',
  'other'
]);

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default('agent'),
  avatarInitials: text("avatar_initials"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Requesters schema (customers who submit tickets)
export const requesters = pgTable("requesters", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  avatarInitials: text("avatar_initials"),
  company: text("company"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tickets schema
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").notNull().default('open'),
  priority: ticketPriorityEnum("priority").notNull().default('medium'),
  category: ticketCategoryEnum("category").notNull(),
  requesterId: integer("requester_id").notNull(),
  assigneeId: integer("assignee_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Insert schemas using drizzle-zod
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  avatarInitials: true,
  createdAt: true,
});

export const insertRequesterSchema = createInsertSchema(requesters).omit({
  id: true,
  avatarInitials: true,
  createdAt: true,
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Requester = typeof requesters.$inferSelect;
export type InsertRequester = z.infer<typeof insertRequesterSchema>;

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;

// Extended type for tickets with requester and assignee information
export type TicketWithRelations = Ticket & {
  requester: Requester;
  assignee?: User;
};
