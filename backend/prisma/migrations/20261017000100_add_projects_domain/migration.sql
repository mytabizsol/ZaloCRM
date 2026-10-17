-- STEP-01 CRM Projects domain
-- Additive only. Before applying with `prisma migrate deploy`, the operator must create
-- and verify a timestamped PostgreSQL backup; see docs/codex/PROJECTS-API.md.

CREATE TABLE "projects" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "project_code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "client_contact_id" TEXT,
  "owner_user_id" TEXT NOT NULL,
  "start_at" TIMESTAMP(3),
  "due_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'planned',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "budget" DOUBLE PRECISION,
  "progress_override" INTEGER,
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "projects_org_id_project_code_key" UNIQUE ("org_id", "project_code"),
  CONSTRAINT "projects_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "projects_client_contact_id_fkey" FOREIGN KEY ("client_contact_id") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "projects_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "project_members" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "access" TEXT NOT NULL DEFAULT 'member',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_members_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_members_project_id_user_id_key" UNIQUE ("project_id", "user_id"),
  CONSTRAINT "project_members_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "project_milestones" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "due_at" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "completed_at" TIMESTAMP(3),
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_milestones_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_milestones_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "project_tasks" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "milestone_id" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "status" TEXT NOT NULL DEFAULT 'todo',
  "assignee_user_id" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "due_at" TIMESTAMP(3),
  "is_deleted" BOOLEAN NOT NULL DEFAULT false,
  "deleted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_tasks_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_tasks_milestone_id_fkey" FOREIGN KEY ("milestone_id") REFERENCES "project_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "project_tasks_assignee_user_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "projects_org_id_status_updated_at_idx" ON "projects"("org_id", "status", "updated_at");
CREATE INDEX "projects_org_id_owner_user_id_idx" ON "projects"("org_id", "owner_user_id");
CREATE INDEX "projects_org_id_client_contact_id_idx" ON "projects"("org_id", "client_contact_id");
CREATE INDEX "project_members_org_id_user_id_idx" ON "project_members"("org_id", "user_id");
CREATE INDEX "project_milestones_org_id_project_id_due_at_idx" ON "project_milestones"("org_id", "project_id", "due_at");
CREATE INDEX "project_tasks_org_id_project_id_status_sort_order_idx" ON "project_tasks"("org_id", "project_id", "status", "sort_order");
CREATE INDEX "project_tasks_org_id_assignee_user_id_due_at_idx" ON "project_tasks"("org_id", "assignee_user_id", "due_at");
CREATE INDEX "project_tasks_milestone_id_idx" ON "project_tasks"("milestone_id");
