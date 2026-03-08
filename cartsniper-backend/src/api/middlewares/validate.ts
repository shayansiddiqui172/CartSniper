import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// Generic validation middleware factory
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Common validation schemas
export const schemas = {
  barcodeScan: z.object({
    barcode: z.string().min(1, 'Barcode is required'),
  }),

  imageScan: z.object({
    imageBase64: z.string().min(1, 'Image is required'),
  }),

  addToCart: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    quantity: z.number().int().positive().optional().default(1),
  }),

  createAlert: z.object({
    productId: z.string().min(1, 'Product ID is required'),
    targetPrice: z.number().positive('Target price must be positive'),
  }),

  comparePrices: z.object({
    productIds: z.array(z.string()).min(1, 'At least one product ID required'),
  }),
};
