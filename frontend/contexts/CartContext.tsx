'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Cart, CartItem } from '@/lib/cart'
import { Currency, convertCurrency } from '@/lib/currency'
import { Product, ProductVariant } from '@/lib/api'

interface CartContextType {
  items: CartItem[]
  currency: Currency
  itemCount: number
  total: number
  addItem: (product: Product, variant?: ProductVariant, quantity?: number) => Promise<void>
  removeItem: (productId: number, variantId?: number) => void
  updateQuantity: (productId: number, variantId: number | undefined, quantity: number) => void
  clearCart: () => void
  setCurrency: (currency: Currency) => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [currency, setCurrencyState] = useState<Currency>('AED')

  useEffect(() => {
    const loadCart = async () => {
      const loadedItems = Cart.getItems()
      const loadedCurrency = Cart.getCurrency() as Currency
      
      // If currency changed, need to convert existing items
      // Check if items need conversion
      const needsConversion = loadedItems.some(
        (item) => item.originalCurrency && item.originalCurrency !== loadedCurrency
      )
      
      if (needsConversion && loadedItems.length > 0) {
        // Convert all items to current currency
        const convertedItems = await Promise.all(
          loadedItems.map(async (item) => {
            if (item.originalCurrency && item.originalCurrency !== loadedCurrency) {
              try {
                const convertedPrice = await convertCurrency(
                  item.originalUnitPrice,
                  item.originalCurrency,
                  loadedCurrency
                )
                return {
                  ...item,
                  unitPrice: convertedPrice,
                  totalPrice: convertedPrice * item.quantity,
                }
              } catch (error) {
                console.error('Error converting currency on load:', error)
                return item
              }
            }
            return item
          })
        )
        Cart.setItems(convertedItems)
        setItems(convertedItems)
      } else {
        setItems(loadedItems)
      }
      
      setCurrencyState(loadedCurrency)
    }
    
    loadCart()
  }, [])

  const addItem = async (product: Product, variant?: ProductVariant, quantity = 1) => {
    await Cart.addItem(product, variant, quantity, currency)
    setItems(Cart.getItems())
  }

  const removeItem = (productId: number, variantId?: number) => {
    Cart.removeItem(productId, variantId)
    setItems(Cart.getItems())
  }

  const updateQuantity = (
    productId: number,
    variantId: number | undefined,
    quantity: number
  ) => {
    Cart.updateQuantity(productId, variantId, quantity)
    setItems(Cart.getItems())
  }

  const clearCart = () => {
    Cart.clear()
    setItems([])
  }

  const setCurrency = async (newCurrency: Currency) => {
    // Recalculate all cart items with new currency
    const items = Cart.getItems()
    const updatedItems = await Promise.all(
      items.map(async (item) => {
        // Convert from original currency to new currency
        let newUnitPrice = item.originalUnitPrice
        if (item.originalCurrency !== newCurrency) {
          try {
            newUnitPrice = await convertCurrency(
              item.originalUnitPrice,
              item.originalCurrency,
              newCurrency
            )
          } catch (error) {
            console.error('Error converting currency:', error)
            // Keep original price if conversion fails
          }
        }
        return {
          ...item,
          unitPrice: newUnitPrice,
          totalPrice: newUnitPrice * item.quantity,
        }
      })
    )
    
    // Update cart with converted prices
    Cart.setItems(updatedItems)
    Cart.setCurrency(newCurrency)
    setCurrencyState(newCurrency)
    setItems(updatedItems)
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
  const total = items.reduce((sum, item) => sum + item.totalPrice, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        currency,
        itemCount,
        total,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        setCurrency,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}


