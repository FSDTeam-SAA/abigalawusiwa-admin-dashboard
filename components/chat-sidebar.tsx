"use client"

import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { vendorApi } from "@/lib/api" // Assuming vendorApi exists and fetches vendors

export interface Customer {
  _id: string
  name: string
  email: string
  profileImage?: string
  totalOrders?: number
  moneySpent?: number
  status?: "approved" | "pending" | "rejected"
  // storeId is the vendor/store ID used for starting conversations
  storeId: string
}

interface ChatSidebarProps {
  selectedCustomer: Customer | null
  onSelectCustomer: (customer: Customer) => void | Promise<void>
  onStartConversation: (customer: Customer) => void | Promise<void>
}

export function ChatSidebar({
  selectedCustomer,
  onSelectCustomer,
  onStartConversation,
}: ChatSidebarProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")

  const fetchVendors = async () => {
    try {
      setLoading(true)

      // Assuming vendorApi.getAll(page, pageSize)
      const response = await vendorApi.getAll(page, 10)
      const { requests = [], paginationInfo } = response?.data?.data || {}

      // Only approved vendors mapped to Customer shape
      const approvedCustomers: Customer[] = (requests as any[])
        .filter((req) => req.status === "approved")
        .map((req) => ({
          _id: req._id,
          name: req.name || req.storeName || req.email || "Unknown",
          email: req.email || req.contactEmail || "",
          profileImage: req.profileImage || req.storeLogo,
          totalOrders: 0, // placeholder until backend sends real values
          moneySpent: 0,  // placeholder until backend sends real values
          status: req.status,
          storeId: req.store, // vendor/store ID used for chat
        }))

      setCustomers(approvedCustomers)
      setTotalPages(paginationInfo?.totalPages || 1)
    } catch (error) {
      console.error("Failed to fetch vendors:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVendors()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Messages</h2>
        <p className="text-sm text-gray-500 mb-4">Chat with your customers</p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search customers"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-50"
          />
        </div>
      </div>

      {/* Customers List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading customers...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No customers found</div>
        ) : (
          filteredCustomers.map((customer) => (
            <div
              key={customer._id}
              role="button"
              tabIndex={0}
              // ⭐ Clicking this whole row triggers onSelectCustomer,
              // which in the page will either open or create a conversation
              onClick={() => void onSelectCustomer(customer)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  void onSelectCustomer(customer)
                }
              }}
              className={`group w-full p-4 border-b border-gray-100 text-left transition-colors cursor-pointer ${
                selectedCustomer?._id === customer._id ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="relative">
                  {customer.profileImage ? (
                    <img
                      src={customer.profileImage || "/placeholder.svg"}
                      alt={customer.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                  <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600 flex items-center px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
