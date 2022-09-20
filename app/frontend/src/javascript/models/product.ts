import { TDateISO } from '../typings/date-iso';
import { ApiFilter, PaginatedIndex } from './api';
import { ProductCategory } from './product-category';
import { Machine } from './machine';

export interface ProductIndexFilter {
  is_active?: boolean,
  page?: number,
  categories?: ProductCategory[],
  machines?: Machine[],
  keywords?: string[],
  stock_type?: 'internal' | 'external',
  stock_from?: number,
  stock_to?: number,
}

export interface ProductIndexFilterIds extends Omit<Omit<ProductIndexFilter, 'categories'>, 'machines'>, ApiFilter {
  categories?: Array<number>,
  machines?: Array<number>,
}

export type StockType = 'internal' | 'external' | 'all';

export const stockMovementInReasons = ['inward_stock', 'returned', 'cancelled', 'inventory_fix', 'other_in'] as const;
export const stockMovementOutReasons = ['sold', 'missing', 'damaged', 'other_out'] as const;
export const stockMovementAllReasons = [...stockMovementInReasons, ...stockMovementOutReasons] as const;

export type StockMovementReason = typeof stockMovementAllReasons[number];

export interface Stock {
  internal: number,
  external: number,
}

export type ProductsIndex = PaginatedIndex<Product>;

export interface ProductStockMovement {
  id?: number,
  product_id?: number,
  quantity?: number,
  reason?: StockMovementReason,
  stock_type?: StockType,
  remaining_stock?: number,
  date?: TDateISO
}

export interface Product {
  id?: number,
  name: string,
  slug: string,
  sku?: string,
  description?: string,
  is_active: boolean,
  product_category_id?: number,
  amount?: number,
  quantity_min?: number,
  stock: Stock,
  low_stock_alert: boolean,
  low_stock_threshold?: number,
  machine_ids: number[],
  created_at?: TDateISO,
  product_files_attributes: Array<{
    id?: number,
    attachment?: File,
    attachment_files?: FileList,
    attachment_name?: string,
    attachment_url?: string,
    _destroy?: boolean
  }>,
  product_images_attributes: Array<{
    id?: number,
    attachment?: File,
    attachment_files?: FileList,
    attachment_name?: string,
    attachment_url?: string,
    _destroy?: boolean,
    is_main?: boolean
  }>,
  product_stock_movements_attributes?: Array<ProductStockMovement>,
}
