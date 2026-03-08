-- CreateTable
CREATE TABLE "Flyer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "storeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "validFrom" DATETIME NOT NULL,
    "validTo" DATETIME NOT NULL,
    "totalPages" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Flyer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlyerPage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flyerId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "imageUrl" TEXT NOT NULL,
    CONSTRAINT "FlyerPage_flyerId_fkey" FOREIGN KEY ("flyerId") REFERENCES "Flyer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FlyerItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flyerPageId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "size" TEXT,
    "price" REAL NOT NULL,
    "originalPrice" REAL,
    "saleStart" TEXT,
    "saleEnd" TEXT,
    "plu" TEXT,
    "upc" TEXT,
    "itemCode" TEXT,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "width" REAL NOT NULL,
    "height" REAL NOT NULL,
    CONSTRAINT "FlyerItem_flyerPageId_fkey" FOREIGN KEY ("flyerPageId") REFERENCES "FlyerPage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FlyerItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Flyer_storeId_idx" ON "Flyer"("storeId");

-- CreateIndex
CREATE INDEX "FlyerPage_flyerId_idx" ON "FlyerPage"("flyerId");

-- CreateIndex
CREATE UNIQUE INDEX "FlyerPage_flyerId_pageNumber_key" ON "FlyerPage"("flyerId", "pageNumber");

-- CreateIndex
CREATE INDEX "FlyerItem_flyerPageId_idx" ON "FlyerItem"("flyerPageId");

-- CreateIndex
CREATE INDEX "FlyerItem_productId_idx" ON "FlyerItem"("productId");
