-- CreateTable
CREATE TABLE "VisitDay" (
    "day" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VisitDay_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "VisitCount" (
    "day" DATE NOT NULL,
    "dimension" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "visitors" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VisitCount_pkey" PRIMARY KEY ("day","dimension","value")
);
