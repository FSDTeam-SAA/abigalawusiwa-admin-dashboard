"use client";

import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categoryApi } from "@/lib/api";
import { ArrowLeft, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface ChildCategory {
  _id?: string;
  name: string;
  thumbnail: string; // existing URL from DB
  thumbFile?: File | null; // new picked file
  preview?: string; // blob preview
}

interface SubCategory {
  _id?: string;
  name: string;
  thumbnail: string; // existing URL from DB
  thumbFile?: File | null;
  preview?: string; // blob preview
  childCategories: ChildCategory[];
}

interface EditCategoryFormProps {
  category: any;
  onCancel: () => void;
  onUpdated: () => void;
  renderThumb: (thumb: string, size?: string) => JSX.Element;
}

export default function EditCategoryForm({
  category,
  onCancel,
  onUpdated,
  renderThumb,
}: EditCategoryFormProps) {
  const { addToast } = useToast();

  const [mainCategory, setMainCategory] = useState("");
  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainPreview, setMainPreview] = useState<string>("");

  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [saving, setSaving] = useState(false);

  // ✅ keep list of all blob urls for cleanup
  const objectUrlsRef = useRef<string[]>([]);

  // ✅ keep refs to file inputs so we can reset them on X
  const mainInputRef = useRef<HTMLInputElement | null>(null);
  const subInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const childInputRefs = useRef<Record<string, HTMLInputElement | null>>({}); // key "sIdx-cIdx"

  const createPreviewUrl = (file: File) => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    return url;
  };

  const revokeUrl = (url?: string) => {
    if (!url) return;
    try {
      URL.revokeObjectURL(url);
    } catch {}
    objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== url);
  };

  const revokeAllObjectUrls = () => {
    objectUrlsRef.current.forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    objectUrlsRef.current = [];
  };

  useEffect(() => {
    return () => revokeAllObjectUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!category) return;

    revokeAllObjectUrls();

    setMainCategory(category.mainCategory || "");
    setMainImageFile(null);
    setMainPreview("");

    // reset file inputs (important when switching categories)
    if (mainInputRef.current) mainInputRef.current.value = "";
    subInputRefs.current = {};
    childInputRefs.current = {};

    const initialSubs: SubCategory[] =
      category.subCategories?.map((sub: any) => ({
        _id: sub._id,
        name: sub.name || "",
        thumbnail: sub.thumbnail || "",
        thumbFile: null,
        preview: "",
        childCategories:
          sub.childCategories?.map((child: any) => ({
            _id: child._id,
            name: child.name || "",
            thumbnail: child.thumbnail || "",
            thumbFile: null,
            preview: "",
          })) || [],
      })) || [];

    setSubCategories(initialSubs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleSubNameChange = (index: number, value: string) => {
    setSubCategories((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], name: value };
      return copy;
    });
  };

  const handleSubThumbChange = (index: number, file: File) => {
    setSubCategories((prev) => {
      const copy = [...prev];

      // ✅ revoke old preview if exists
      if (copy[index]?.preview) revokeUrl(copy[index].preview);

      const preview = createPreviewUrl(file);
      copy[index] = { ...copy[index], thumbFile: file, preview };
      return copy;
    });
  };

  const clearSubThumb = (subIndex: number) => {
    setSubCategories((prev) => {
      const copy = [...prev];

      // ✅ revoke preview
      if (copy[subIndex]?.preview) revokeUrl(copy[subIndex].preview);

      copy[subIndex] = { ...copy[subIndex], thumbFile: null, preview: "" };
      return copy;
    });

    // ✅ reset file input value
    const ref = subInputRefs.current[subIndex];
    if (ref) ref.value = "";
  };

  const handleChildNameChange = (subIndex: number, childIndex: number, value: string) => {
    setSubCategories((prev) => {
      const subsCopy = [...prev];
      const sub = { ...subsCopy[subIndex] };
      const childrenCopy = [...sub.childCategories];

      childrenCopy[childIndex] = { ...childrenCopy[childIndex], name: value };
      sub.childCategories = childrenCopy;
      subsCopy[subIndex] = sub;
      return subsCopy;
    });
  };

  const handleChildThumbChange = (subIndex: number, childIndex: number, file: File) => {
    setSubCategories((prev) => {
      const subsCopy = [...prev];
      const sub = { ...subsCopy[subIndex] };
      const childrenCopy = [...sub.childCategories];

      // ✅ revoke old preview if exists
      if (childrenCopy[childIndex]?.preview) revokeUrl(childrenCopy[childIndex].preview);

      const preview = createPreviewUrl(file);
      childrenCopy[childIndex] = { ...childrenCopy[childIndex], thumbFile: file, preview };

      sub.childCategories = childrenCopy;
      subsCopy[subIndex] = sub;
      return subsCopy;
    });
  };

  const clearChildThumb = (subIndex: number, childIndex: number) => {
    const key = `${subIndex}-${childIndex}`;

    setSubCategories((prev) => {
      const subsCopy = [...prev];
      const sub = { ...subsCopy[subIndex] };
      const childrenCopy = [...sub.childCategories];

      if (childrenCopy[childIndex]?.preview) revokeUrl(childrenCopy[childIndex].preview);

      childrenCopy[childIndex] = { ...childrenCopy[childIndex], thumbFile: null, preview: "" };

      sub.childCategories = childrenCopy;
      subsCopy[subIndex] = sub;
      return subsCopy;
    });

    const ref = childInputRefs.current[key];
    if (ref) ref.value = "";
  };

  const handleAddSubCategory = () => {
    setSubCategories((prev) => [
      ...prev,
      { _id: undefined, name: "", thumbnail: "", thumbFile: null, preview: "", childCategories: [] },
    ]);
  };

  const handleAddChildCategory = (subIndex: number) => {
    setSubCategories((prev) => {
      const subsCopy = [...prev];
      const sub = { ...subsCopy[subIndex] };

      sub.childCategories = [
        ...sub.childCategories,
        { _id: undefined, name: "", thumbnail: "", thumbFile: null, preview: "" },
      ];

      subsCopy[subIndex] = sub;
      return subsCopy;
    });
  };

  const handleRemoveSubCategory = (subIndex: number) => {
    setSubCategories((prev) => {
      // revoke previews of removed sub + children
      const sub = prev[subIndex];
      if (sub?.preview) revokeUrl(sub.preview);
      sub?.childCategories?.forEach((c) => c.preview && revokeUrl(c.preview));

      return prev.filter((_, idx) => idx !== subIndex);
    });

    const ref = subInputRefs.current[subIndex];
    if (ref) ref.value = "";
  };

  const handleRemoveChildCategory = (subIndex: number, childIndex: number) => {
    const key = `${subIndex}-${childIndex}`;

    setSubCategories((prev) => {
      const subsCopy = [...prev];
      const sub = { ...subsCopy[subIndex] };

      const removed = sub.childCategories[childIndex];
      if (removed?.preview) revokeUrl(removed.preview);

      sub.childCategories = sub.childCategories.filter((_, idx) => idx !== childIndex);
      subsCopy[subIndex] = sub;
      return subsCopy;
    });

    const ref = childInputRefs.current[key];
    if (ref) ref.value = "";
  };

  const clearMainThumb = () => {
    if (mainPreview) revokeUrl(mainPreview);
    setMainImageFile(null);
    setMainPreview("");

    if (mainInputRef.current) mainInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!category) return;
    setSaving(true);

    try {
      const fd = new FormData();

      fd.append("mainCategory", mainCategory);
      fd.append("mode", "replace");

      if (mainImageFile) fd.append("mainCategoryImage", mainImageFile);

      fd.append(
        "subCategories",
        JSON.stringify(
          subCategories.map((sub) => ({
            _id: sub._id,
            name: sub.name,
            thumbnail: sub.thumbnail,
            childCategories: sub.childCategories.map((child) => ({
              _id: child._id,
              name: child.name,
              thumbnail: child.thumbnail,
            })),
          }))
        )
      );

      subCategories.forEach((sub, sIdx) => {
        if (sub.thumbFile) fd.append(`subCategoryThumbnails[${sIdx}]`, sub.thumbFile);

        sub.childCategories.forEach((child, cIdx) => {
          if (child.thumbFile) {
            fd.append(`childCategoryThumbnails[${sIdx}][${cIdx}]`, child.thumbFile);
          }
        });
      });

      await categoryApi.update(category._id, fd);

      addToast({ title: "Category updated successfully", type: "success" });
      await onUpdated();

      clearMainThumb();

      setSubCategories((prev) =>
        prev.map((s) => ({
          ...s,
          thumbFile: null,
          preview: "",
          childCategories: s.childCategories.map((c) => ({
            ...c,
            thumbFile: null,
            preview: "",
          })),
        }))
      );

      revokeAllObjectUrls();
    } catch (err: any) {
      addToast({
        title: err?.response?.data?.message || "Failed to update category",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const mainThumbToShow = useMemo(() => {
    return mainPreview || category?.mainCategoryImage || "";
  }, [mainPreview, category?.mainCategoryImage]);

  if (!category) return null;

  return (
    <div className="min-h-[80vh] bg-slate-50 rounded-lg p-4 md:p-6">
      <div className="bg-white rounded-xl border shadow-sm p-6 md:p-8 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
              Edit Category
            </h2>
            <p className="text-sm text-gray-500">
              Update the main category, subcategories and child categories.
            </p>
          </div>

          <Button variant="outline" onClick={onCancel} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to list</span>
          </Button>
        </div>

        {/* MAIN INFO */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
            Main Info
          </h3>

          <div className="bg-slate-100 p-4 rounded-lg border grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">Main Category</label>
              <Input value={mainCategory} disabled onChange={(e) => setMainCategory(e.target.value)} />
            </div>

            <div className="space-y-1.5 flex items-center justify-center">
              <div className="relative flex flex-col items-center justify-center gap-3 bg-white p-4 rounded-lg border">
                {renderThumb(mainThumbToShow, "w-24 h-24")}

                {mainPreview && (
                  <button
                    type="button"
                    onClick={clearMainThumb}
                    className="absolute top-2 right-2 rounded-full bg-white/90 border shadow p-1 hover:bg-white"
                    aria-label="Remove selected image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}

                <Input
                  ref={mainInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // revoke old preview
                    if (mainPreview) revokeUrl(mainPreview);

                    setMainImageFile(file);
                    setMainPreview(createPreviewUrl(file));
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* SUB CATEGORIES */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                Sub Categories
              </h3>
              <p className="text-xs text-gray-500">
                Manage subcategories and their child categories under this main category.
              </p>
            </div>

            <Button size="sm" variant="outline" onClick={handleAddSubCategory}>
              + Add Subcategory
            </Button>
          </div>

          <div className="space-y-3">
            {subCategories.map((sub, subIndex) => {
              const subThumbToShow = sub.preview || sub.thumbnail || "";

              return (
                <div key={sub._id || `new-sub-${subIndex}`} className="border rounded-lg p-4 bg-slate-50 space-y-3">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="relative flex flex-col items-center gap-2 bg-slate-100 p-3 rounded-md border">
                      {renderThumb(subThumbToShow, "w-20 h-20")}

                      {sub.preview && (
                        <button
                          type="button"
                          onClick={() => clearSubThumb(subIndex)}
                          className="absolute top-2 right-2 rounded-full bg-white/90 border shadow p-1 hover:bg-white"
                          aria-label="Remove selected subcategory image"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}

                      <Input
                        ref={(el) => {
                          subInputRefs.current[subIndex] = el;
                        }}
                        type="file"
                        accept="image/*"
                        className="text-xs"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleSubThumbChange(subIndex, file);
                        }}
                      />
                    </div>

                    <div className="flex-1 space-y-2">
                      <label className="text-xs font-medium text-gray-600">Subcategory Name</label>
                      <div className="flex gap-2 items-center">
                        <Input
                          placeholder="Subcategory name"
                          value={sub.name}
                          onChange={(e) => handleSubNameChange(subIndex, e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          className="text-red-500"
                          size="sm"
                          onClick={() => handleRemoveSubCategory(subIndex)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* CHILD CATEGORIES */}
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-700">Child Categories</p>
                      <Button type="button" variant="outline" size="sm" onClick={() => handleAddChildCategory(subIndex)}>
                        + Add Child
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {sub.childCategories.map((child, childIndex) => {
                        const childThumbToShow = child.preview || child.thumbnail || "";
                        const key = `${subIndex}-${childIndex}`;

                        return (
                          <div
                            key={child._id || `new-child-${subIndex}-${childIndex}`}
                            className="flex flex-wrap items-center gap-3 bg-slate-100 rounded-md border px-3 py-2"
                          >
                            <div className="relative flex flex-col items-center gap-2 bg-white p-2 rounded-md border">
                              {renderThumb(childThumbToShow, "w-16 h-16")}

                              {child.preview && (
                                <button
                                  type="button"
                                  onClick={() => clearChildThumb(subIndex, childIndex)}
                                  className="absolute top-1 right-1 rounded-full bg-white/90 border shadow p-1 hover:bg-white"
                                  aria-label="Remove selected child image"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}

                              <Input
                                ref={(el) => {
                                  childInputRefs.current[key] = el;
                                }}
                                type="file"
                                accept="image/*"
                                className="w-40"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleChildThumbChange(subIndex, childIndex, file);
                                }}
                              />
                            </div>

                            <Input
                              placeholder="Child category name"
                              value={child.name}
                              onChange={(e) => handleChildNameChange(subIndex, childIndex, e.target.value)}
                              className="flex-1 min-w-[160px]"
                            />

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              onClick={() => handleRemoveChildCategory(subIndex, childIndex)}
                            >
                              Remove
                            </Button>
                          </div>
                        );
                      })}

                      {sub.childCategories.length === 0 && (
                        <p className="text-xs text-gray-500">
                          No child categories yet. Click &quot;Add Child&quot; to create one.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {subCategories.length === 0 && (
              <p className="text-xs text-gray-500">
                No subcategories yet. Click &quot;Add Subcategory&quot; to create one.
              </p>
            )}
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
