-- CreateEnum
CREATE TYPE "ListType" AS ENUM ('daily', 'weekly', 'master', 'uni');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('uni', 'work', 'personal');

-- CreateEnum
CREATE TYPE "Recurring" AS ENUM ('none', 'daily', 'weekly', 'custom');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('todo', 'done', 'archived');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('manual', 'ai_dictated', 'syllabus_import');

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3),
    "time" TEXT,
    "durationMin" INTEGER,
    "listType" "ListType" NOT NULL,
    "category" "Category" NOT NULL,
    "course" TEXT,
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "recurring" "Recurring" NOT NULL DEFAULT 'none',
    "recurringRule" TEXT,
    "syncedToCalendar" BOOLEAN NOT NULL DEFAULT false,
    "googleEventId" TEXT,
    "status" "Status" NOT NULL DEFAULT 'todo',
    "source" "Source" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);
