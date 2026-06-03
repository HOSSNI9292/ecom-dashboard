"use client";

import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime, getImageUrl } from "@/utils";
import type { Order } from "@/types";
import {
  User, Phone, Globe, Package, DollarSign, Clock, Tag,
  Copy, MessageCircle, MapPin, ChevronLeft, ChevronRight
} from "lucide-react";
import { useState } from "react";

interface OrderModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
}

function Field({ icon, label, value, action }: { icon: React.ReactNode; label: string; value: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0A0A0B] border border-[#27272A]">
      <div className="p-2 rounded-xl bg-[#10B981]/5 mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[#71717A] text-[10px] uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-[#FAFAFA] text-sm font-medium mt-0.5 break-all">{value}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function OrderModal({ order, open, onClose }: OrderModalProps) {
  const [imgIndex, setImgIndex] = useState(0);

  if (!order) return null;

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(order.phone);
  };

  const whatsappUrl = `https://wa.me/${order.phone.replace(/[^0-9]/g, "")}`;
  const images = order.productImages?.filter(Boolean) || [];
  const hasMultipleImages = images.length > 1;

  return (
    <Modal open={open} onClose={onClose} title={`Order #${order.orderId}`}>
      <div className="space-y-3">
        {order.productImage && (
          <div className="relative rounded-xl overflow-hidden bg-[#0A0A0B] border border-[#27272A] aspect-video flex items-center justify-center">
            <img
              src={getImageUrl(images[imgIndex] || order.productImage)}
              alt={order.productName}
              className="max-w-full max-h-full object-contain hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            {hasMultipleImages && (
              <>
                <button
                  onClick={() => setImgIndex((i) => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-black/60 text-white hover:bg-black/80 transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all duration-200 ${
                        i === imgIndex ? "bg-white w-3" : "bg-white/40 hover:bg-white/60"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <Field
          icon={<User className="w-4 h-4 text-[#34D399]" />}
          label="Customer"
          value={order.customerName}
        />
        <Field
          icon={<Phone className="w-4 h-4 text-[#10B981]" />}
          label="Phone"
          value={order.phone}
          action={
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyPhone}
                className="p-2 rounded-xl text-[#71717A] hover:text-[#FAFAFA] hover:bg-[#27272A] transition-all duration-200"
                title="Copy phone number"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-[#25D366] hover:bg-[#27272A] transition-all duration-200"
                title="Open WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </a>
            </div>
          }
        />
        <Field
          icon={<Globe className="w-4 h-4 text-[#F59E0B]" />}
          label="Country"
          value={order.countryName || order.country}
        />
        <Field
          icon={<Package className="w-4 h-4 text-[#10B981]" />}
          label="Product"
          value={`${order.productName}${order.productCode ? ` (${order.productCode})` : ""}`}
        />
        <Field
          icon={<DollarSign className="w-4 h-4 text-[#10B981]" />}
          label="Amount"
          value={formatCurrency(order.amount)}
        />
        <Field
          icon={<Clock className="w-4 h-4 text-[#71717A]" />}
          label="Date"
          value={formatDateTime(order.date)}
        />
        {order.city && (
          <Field
            icon={<MapPin className="w-4 h-4 text-[#71717A]" />}
            label="City"
            value={order.city}
          />
        )}
        <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0A0A0B] border border-[#27272A]">
          <div className="p-2 rounded-xl bg-[#10B981]/5 mt-0.5 shrink-0">
            <Tag className="w-4 h-4 text-[#34D399]" />
          </div>
          <div>
            <p className="text-[#71717A] text-[10px] uppercase tracking-widest font-semibold">Status</p>
            <div className="mt-1">
              <StatusBadge status={order.status} color={order.statusColor} size="md" />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
