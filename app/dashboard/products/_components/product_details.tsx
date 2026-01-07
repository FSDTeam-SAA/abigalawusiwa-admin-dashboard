"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { productApi, categoryApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  BadgeCheck, 
  ExternalLink, 
  FileText, 
  LayoutDashboard, 
  ShieldAlert,
  Package,
  Store,
  Tag,
  Star
} from "lucide-react";
import { useRouter } from "next/navigation";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// --- Types ---
type ChildCategory = { _id: string; name: string };
type SubCategory = { _id: string; name: string; childCategories: ChildCategory[] };
type CategoryDoc = { _id: string; mainCategory: string; subCategories: SubCategory[] };

// --- Sub-components for Clean UI ---

/**
 * Handles formatting for different data types automatically
 */
const formatValue = (val: any) => {
  if (val === null || val === undefined || val === "") return "-";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (Array.isArray(val)) return val.length ? val.join(", ") : "-";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
  return String(val);
};

function FieldRow({ label, value, isBold = false }: { label: string; value: any; isBold?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-1">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className={`text-sm break-words sm:text-right max-w-[60%] ${isBold ? "font-bold text-blue-700" : "font-semibold text-gray-900"}`}>
        {formatValue(value)}
      </span>
    </div>
  );
}

function SectionCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon?: any }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-full">
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-gray-400" />}
        <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// --- Main Page Component ---

export default function ProductDetails({ productId }: { productId: string }) {
  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [storeReviewStats, setStoreReviewStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [subCategoryName, setSubCategoryName] = useState("");
  const [childCategoryName, setChildCategoryName] = useState("");
  
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const prodRes = await productApi.getById(productId);
      const data = prodRes.data?.data;
      const p = data?.product || data;
      setProduct(p);
      setReviews(data?.reviews || []);
      setStoreReviewStats(data?.storeReviewStats || null);

      // Resolve Category Tree Names
      const catRes = await categoryApi.getAll(1, 100);
      const categories: CategoryDoc[] = catRes.data?.data?.categories || [];

      for (const main of categories) {
        for (const sub of main.subCategories) {
          if (sub._id === p?.subCategory) setSubCategoryName(sub.name);
          for (const child of sub.childCategories) {
            if (child._id === p?.childCategory) {
              setChildCategoryName(child.name);
              if (!subCategoryName) setSubCategoryName(sub.name);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to load product details:", err);
    } finally {
      setLoading(false);
    }
  }, [productId, subCategoryName]);

  useEffect(() => {
    if (productId) fetchData();
  }, [productId, fetchData]);

  const handleToggleVerify = async () => {
    try {
      setVerifying(true);
      await productApi.verify(product._id, !product.isVerified);
      await fetchData();
    } catch (err) {
      console.error("Verification update error:", err);
    } finally {
      setVerifying(false);
    }
  };

  if (loading) return <ProductDetailsSkeleton />;
  if (!product) return <div className="p-20 text-center text-gray-400">Product not found.</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 space-y-6">
      
      {/* 1. TOP NAVIGATION & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 bg-[#f8fafc]/80 backdrop-blur-md pb-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-white shadow-sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/products")}>
            <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
          </Button>
        </div>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant={product.isVerified ? "outline" : "default"} 
              className={!product.isVerified ? "bg-green-600 hover:bg-green-700 shadow-lg" : "border-red-200 text-red-600 hover:bg-red-50"}
              disabled={verifying}
            >
              {product.isVerified ? <ShieldAlert className="w-4 h-4 mr-2" /> : <BadgeCheck className="w-4 h-4 mr-2" />}
              {verifying ? "Processing..." : product.isVerified ? "Unverify Product" : "Verify Product"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Change Verification Status?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to {product.isVerified ? "remove verification from" : "verify"} <strong>{product.title}</strong>? 
                This action will be logged and visible to the store owner.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleToggleVerify} className={product.isVerified ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* 2. HERO INFO */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">{product.title || "Untitled Product"}</h1>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              product.isVerified ? "bg-green-100 text-green-700 border border-green-200" : "bg-amber-100 text-amber-700 border border-amber-200"
            }`}>
              {product.isVerified ? "Verified" : "Pending Verification"}
            </span>
          </div>
          <p className="text-gray-400 font-mono text-xs">SKU: {product.productCode || product._id}</p>
        </div>
        <div className="flex gap-8">
           <div className="text-right">
              <p className="text-xs text-gray-400 uppercase font-bold">Price</p>
              <p className="text-2xl font-black text-blue-600">${product.price || 0}</p>
           </div>
           <div className="text-right">
              <p className="text-xs text-gray-400 uppercase font-bold">Discount Price</p>
              <p className="text-2xl font-black text-blue-600">${product.discountPrice || 0}</p>
           </div>
           <div className="text-right">
              <p className="text-xs text-gray-400 uppercase font-bold">Stock</p>
              <p className="text-2xl font-black text-gray-900">{product.generalGoods?.stockQuantity || 0}</p>
           </div>
        </div>
      </div>

      {/* 3. MEDIA GRID */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 h-full">
          <SectionCard title="Main Representative Image">
            <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
              {product.mainImage ? (
                <Image src={product.mainImage} alt="Main" fill className="object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <Package className="w-8 h-8 opacity-20" />
                  <span className="text-sm">No Image</span>
                </div>
              )}
            </div>
          </SectionCard>
        </div>
        <div className="md:col-span-8 h-full">
          <SectionCard title="Media Gallery">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {product.imageGallery?.map((src: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm group">
                  <Image src={src} alt="Gallery" fill className="object-cover group-hover:scale-110 transition-transform duration-300" />
                </div>
              ))}
              {!product.imageGallery?.length && <p className="text-gray-400 text-sm italic">No additional images.</p>}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* 4. INFO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <SectionCard title="Classification" icon={Tag}>
            <FieldRow label="Main Category" value={product.mainCategory} isBold />
            <FieldRow label="Sub Category" value={subCategoryName} />
            <FieldRow label="Child Category" value={childCategoryName} />
            <FieldRow label="Tags" value={product.tags} />
          </SectionCard>
          
          <SectionCard title="Ownership" icon={Store}>
            <FieldRow label="Store Name" value={product.store?.storeName} isBold />
            <FieldRow label="Vendor" value={product.createdBy?.name} />
            <FieldRow label="Vendor Email" value={product.createdBy?.email} />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Product Specs" icon={Package}>
            <FieldRow label="Brand" value={product.generalGoods?.brand} />
            <FieldRow label="Size" value={product.generalGoods?.size} />
            <FieldRow label="Color" value={product.generalGoods?.color} />
            <FieldRow label="Wholesale" value={`$${product.generalGoods?.wholesalePrice}`} />
          </SectionCard>

          <SectionCard title="Performance" icon={Star}>
            <FieldRow label="Avg Rating" value={product.rating} />
            <FieldRow label="Reviews" value={product.ratingCount} />
            <FieldRow label="Total Sales" value={product.salesCount} isBold />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Administrative">
            <FieldRow label="Created" value={product.createdAt} />
            <FieldRow label="Last Update" value={product.updatedAt} />
            <FieldRow label="Verified At" value={product.verifiedAt} />
            <FieldRow label="Verified By" value={product.verifiedBy?.name || product.verifiedBy} />
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
               <p className="text-[10px] text-blue-500 font-bold uppercase mb-1">SEO Slug</p>
               <p className="text-xs font-mono text-blue-800 break-all">{product.seo?.slug || "-"}</p>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* 5. TEXTUAL CONTENT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Description">
          <div className="text-sm text-gray-700 leading-relaxed max-h-[300px] overflow-y-auto pr-2">
            {product.description || "No description provided."}
          </div>
        </SectionCard>
        <SectionCard title="Delivery & Returns">
          <div className="text-sm text-gray-700 leading-relaxed max-h-[300px] overflow-y-auto pr-2">
            {product.deliveryAndReturnPolicy || "No policy stated."}
          </div>
        </SectionCard>
      </div>

      {/* 6. DOCUMENTS & PDF */}
      {product.generalGoods?.documents?.length > 0 && (
        <SectionCard title="Compliance Documents" icon={FileText}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {product.generalGoods.documents.map((url: string, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-4 border rounded-xl hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">Document #{idx + 1}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{url}</p>
                  </div>
                </div>
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>

          {/* PDF In-line Preview */}
          <div className="grid grid-cols-1 gap-6">
            {product.generalGoods.documents
              .filter((u: string) => u.toLowerCase().endsWith(".pdf"))
              .map((pdfUrl: string, idx: number) => (
                <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-gray-50 px-4 py-2 text-[10px] font-black uppercase text-gray-400 border-b flex justify-between">
                    <span>PDF Preview - Document {idx + 1}</span>
                    <span>Ready</span>
                  </div>
                  <iframe src={pdfUrl} className="w-full h-[600px]" title={`PDF ${idx}`} />
                </div>
              ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// --- Skeleton Loader ---
function ProductDetailsSkeleton() {
  return (
    <div className="p-8 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-32 rounded-lg" />
        <Skeleton className="h-10 w-44 rounded-lg" />
      </div>
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-12 gap-6">
        <Skeleton className="col-span-4 h-64 rounded-xl" />
        <Skeleton className="col-span-8 h-64 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-6">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}