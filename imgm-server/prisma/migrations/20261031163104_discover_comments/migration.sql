-- CreateTable
CREATE TABLE "DiscoverComment" (
    "id" TEXT NOT NULL,
    "gameId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoverComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoverCommentLike" (
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoverCommentLike_pkey" PRIMARY KEY ("userId","commentId")
);

-- CreateTable
CREATE TABLE "DiscoverCommentReport" (
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscoverCommentReport_pkey" PRIMARY KEY ("userId","commentId")
);

-- CreateIndex
CREATE INDEX "DiscoverComment_gameId_parentId_idx" ON "DiscoverComment"("gameId", "parentId");

-- CreateIndex
CREATE INDEX "DiscoverComment_parentId_idx" ON "DiscoverComment"("parentId");

-- CreateIndex
CREATE INDEX "DiscoverCommentLike_commentId_idx" ON "DiscoverCommentLike"("commentId");

-- AddForeignKey
ALTER TABLE "DiscoverComment" ADD CONSTRAINT "DiscoverComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoverComment" ADD CONSTRAINT "DiscoverComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "DiscoverComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoverCommentLike" ADD CONSTRAINT "DiscoverCommentLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoverCommentLike" ADD CONSTRAINT "DiscoverCommentLike_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "DiscoverComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoverCommentReport" ADD CONSTRAINT "DiscoverCommentReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoverCommentReport" ADD CONSTRAINT "DiscoverCommentReport_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "DiscoverComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
