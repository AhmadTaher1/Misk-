export interface CartItem {
  userId: number;
  productId: number;
  quantity: number;
  addedAt: string;
  productName: string;
  productPhoto: string; 
  productPrice: number;
  availableStock: number;
  totalPrice: number;
}

export interface CartResponse {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface CartItemDto {
  productId: number;
  quantity: number;
}