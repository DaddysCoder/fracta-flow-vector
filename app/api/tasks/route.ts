import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const listType = searchParams.get("listType");
  const date = searchParams.get("date");

  const where: Prisma.TaskWhereInput = {
    status: { not: "archived" },
  };

  if (listType) {
    where.listType = listType as Prisma.TaskWhereInput["listType"];
  }

  if (date) {
    const dayStart = new Date(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    where.date = { gte: dayStart, lt: dayEnd };
  }

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.title || !body.listType || !body.category) {
    return NextResponse.json(
      { error: "title, listType, and category are required" },
      { status: 400 }
    );
  }

  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      date: body.date ? new Date(body.date) : null,
      time: body.time ?? null,
      durationMin: body.durationMin ?? null,
      listType: body.listType,
      category: body.category,
      course: body.course ?? null,
      priority: body.priority ?? false,
      recurring: body.recurring ?? "none",
      recurringRule: body.recurringRule ?? null,
      syncedToCalendar: body.syncedToCalendar ?? false,
      googleEventId: body.googleEventId ?? null,
      status: body.status ?? "todo",
      source: body.source ?? "manual",
    },
  });

  return NextResponse.json(task, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  if (fields.status === "done") {
    fields.status = "archived";
  }

  if (fields.date !== undefined) {
    fields.date = fields.date ? new Date(fields.date) : null;
  }

  const task = await prisma.task.update({
    where: { id },
    data: fields,
  });

  return NextResponse.json(task);
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
