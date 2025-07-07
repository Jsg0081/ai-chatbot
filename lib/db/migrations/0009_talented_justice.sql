CREATE TABLE IF NOT EXISTS "KnowledgeStore" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"name" text NOT NULL,
	"type" varchar NOT NULL,
	"content" text,
	"url" text,
	"fileData" json,
	"size" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "VerseNote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"userId" uuid NOT NULL,
	"book" varchar(50) NOT NULL,
	"chapter" varchar(10) NOT NULL,
	"verseStart" varchar(10) NOT NULL,
	"verseEnd" varchar(10),
	"translation" varchar(50) DEFAULT 'ESV' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"verseText" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "KnowledgeStore" ADD CONSTRAINT "KnowledgeStore_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "VerseNote" ADD CONSTRAINT "VerseNote_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
