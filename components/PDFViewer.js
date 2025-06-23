"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/utils/supabaseClient"
import { Document, Page, pdfjs } from "react-pdf"
import {
  Accordion,
  AccordionItem,
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Textarea,
  Spinner,
} from "@nextui-org/react"
import { ChevronLeft, ChevronRight, FileText, Menu, Plus, Trash2, Edit } from "lucide-react"
import FileUploader from "./FileUploader"

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`


export default function PDFViewer({ type = "user" }) {
  const [pdfCategories, setPDFCategories] = useState([])
  const [pdfMaterial, setPDFMaterial] = useState([])
  const [activePDFMaterial, setActivePDFMaterial] = useState(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [pdfData, setPDFData] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages)
    setPageNumber(1)
  }

  const changePage = (offset) => {
    setPageNumber((prevPageNumber) => {
      const newPageNumber = prevPageNumber + offset
      return Math.min(Math.max(1, newPageNumber), numPages)
    })
  }

  const previousPage = () => changePage(-1)
  const nextPage = () => changePage(1)

  async function addPDFCategory(data) {
    if (!data) return null

    setIsLoading(true)
    const { error } = await supabase.from("pdfs").insert({
      title: data.title,
      description: data.description,
      type: "category",
    })

    if (!error) {
      getPDFCategories()
      setPDFData({})
    } else {
      console.error("Error adding PDF category:", error)
    }
    setIsLoading(false)
  }

  async function getPDFCategories() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("pdfs")
      .select("*")
      .eq("type", "category")
      .order("created_at", { ascending: true })

    if (data) {
      setPDFCategories(data)
    } else if (error) {
      console.error("Error fetching PDF categories:", error)
    }
    setIsLoading(false)
  }

  async function getPDFMaterial() {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("pdfs")
      .select("*")
      .eq("type", "content")
      .order("created_at", { ascending: true })

    if (data) {
      setPDFMaterial(data)
    } else if (error) {
      console.error("Error fetching PDF materials:", error)
    }
    setIsLoading(false)
  }

  async function deletePDFMaterial(id) {
    if (!id) return null

    setIsLoading(true)
    const { error } = await supabase.from("pdfs").delete().eq("id", id)

    if (!error) {
      getPDFMaterial()
    } else {
      console.error("Error deleting PDF material:", error)
    }
    setIsLoading(false)
  }

  async function deletePDFCategory(id) {
    if (!id) return null

    setIsLoading(true)
    const { error } = await supabase.from("pdfs").delete().eq("id", id)

    if (!error) {
      getPDFCategories()
    } else {
      console.error("Error deleting PDF category:", error)
    }
    setIsLoading(false)
  }

  async function updatePDFMaterial(data, id) {
    if (!data || !id) return null

    setIsLoading(true)
    const { error } = await supabase
      .from("pdfs")
      .update({
        title: data.utitle,
        description: data.udescription,
        url: data.vvideo,
      })
      .eq("id", id)

    if (!error) {
      getPDFMaterial()
      setPDFData({})
    } else {
      console.error("Error updating PDF material:", error)
    }
    setIsLoading(false)
  }

  async function updatePDFCategory(data, id) {
    if (!data || !id) return null

    setIsLoading(true)
    const { error } = await supabase
      .from("pdfs")
      .update({
        title: data.utitle,
        description: data.udescription,
      })
      .eq("id", id)

    if (!error) {
      getPDFCategories()
      setPDFData({})
    } else {
      console.error("Error updating PDF category:", error)
    }
    setIsLoading(false)
  }

  async function addPDFMaterial(data, parentId) {
    if (!data || !parentId) return null

    setIsLoading(true)
    const { error } = await supabase.from("pdfs").insert({
      title: data.vtitle,
      description: data.vdescription,
      url: data.vvideo,
      type: "content",
      parent: parentId,
    })

    if (!error) {
      getPDFMaterial()
      setPDFData({})
    } else {
      console.error("Error adding PDF material:", error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([getPDFCategories(), getPDFMaterial()])
    }

    fetchData()
  }, [])

  // Close sidebar when a PDF is selected on mobile
  useEffect(() => {
    if (activePDFMaterial && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }, [activePDFMaterial])

  return (
    <div className="w-full h-full flex flex-col">
      {/* Mobile Header with Toggle */}
      <div className="lg:hidden flex items-center justify-between p-2 bg-white border-b">
        <Button
          isIconOnly
          variant="light"
          aria-label="Toggle document selector"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          <Menu size={24} />
        </Button>
        <h1 className="text-lg font-semibold">PDF Viewer</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </div>

      <div className="w-full h-full flex flex-row relative overflow-hidden">
        {/* Document Selector Sidebar */}
        <div
          className={`absolute lg:relative z-10 w-full lg:w-1/3 xl:w-1/4 h-[calc(100vh-60px)] lg:h-full bg-white border-r transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full flex flex-col overflow-y-auto p-3">
            {isLoading && (
              <div className="flex justify-center items-center p-4">
                <Spinner size="lg" />
              </div>
            )}

            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Documents</h2>
              {type === "admin" && (
                <Popover placement="bottom-end">
                  <PopoverTrigger>
                    <Button isIconOnly size="sm" color="primary">
                      <Plus size={16} />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-3 sm:p-4 w-[280px] sm:w-[320px] max-w-[95vw]">
                    <div className="flex flex-col gap-3">
                      <Input
                        label="PDF Category Title"
                        placeholder="Enter PDF Category Title"
                        onChange={(e) => setPDFData((prev) => ({ ...prev, title: e.target.value }))}
                      />
                      <Textarea
                        label="PDF Category Description (optional)"
                        placeholder="Enter PDF Category Description (optional)"
                        onChange={(e) => setPDFData((prev) => ({ ...prev, description: e.target.value }))}
                      />
                      <Button color="primary" onClick={() => addPDFCategory(pdfData)}>
                        Add PDF Category
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <Accordion isCompact defaultExpandedKeys={["0"]} className="p-0">
              {pdfCategories &&
                pdfCategories.map((category, index) => (
                  <AccordionItem
                    key={index}
                    aria-label={category.title}
                    title={
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">{category.title}</span>
                        {type === "admin" && (
                          <div className="flex gap-1">
                            <Popover
                              onOpenChange={(isOpen) => {
                                if (isOpen) {
                                  setPDFData({
                                    utitle: category.title,
                                    udescription: category.description,
                                  })
                                }
                              }}
                            >
                              <PopoverTrigger>
                                <Button isIconOnly size="sm" variant="light">
                                  <Edit size={14} />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="p-3 sm:p-4 w-[280px] sm:w-[320px] max-w-[95vw]">
                                <div className="flex flex-col gap-3">
                                  <Input
                                    value={pdfData?.utitle}
                                    label="PDF Category Title"
                                    placeholder="Enter PDF Category Title"
                                    onChange={(e) => setPDFData((prev) => ({ ...prev, utitle: e.target.value }))}
                                  />
                                  <Textarea
                                    value={pdfData?.udescription}
                                    label="PDF Category Description (optional)"
                                    placeholder="Enter PDF Category Description (optional)"
                                    onChange={(e) => setPDFData((prev) => ({ ...prev, udescription: e.target.value }))}
                                  />
                                  <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => updatePDFCategory(pdfData, category.id)}
                                  >
                                    Update
                                  </Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="danger"
                              onClick={() => deletePDFCategory(category.id)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        )}
                      </div>
                    }
                    subtitle={category.description && <span className="text-xs">{category.description}</span>}
                  >
                    {/* PDF Materials as List View */}
                    <div className="flex flex-col gap-1">
                      {pdfMaterial &&
                        pdfMaterial
                          .filter((material) => material.parent === category.id)
                          .map((material, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center p-2 rounded-md hover:bg-gray-100 cursor-pointer ${
                                activePDFMaterial?.id === material.id ? "bg-gray-100" : ""
                              }`}
                              onClick={() => {
                                setActivePDFMaterial(material)
                                if (window.innerWidth < 1024) setSidebarOpen(false)
                              }}
                            >
                              <FileText size={16} className="text-gray-500 mr-2 flex-shrink-0" />
                              <div className="flex-grow min-w-0">
                                <div className="font-medium text-sm text-left truncate">{material.title}</div>
                                {material.description && (
                                  <div className="text-xs text-gray-500 text-left truncate">{material.description}</div>
                                )}
                              </div>
                              {type === "admin" && (
                                <div className="flex gap-1 ml-2">
                                  <Popover
                                    placement="bottom-end"
                                    onOpenChange={(isOpen) => {
                                      if (isOpen) {
                                        setPDFData({
                                          vtitle: material.title,
                                          vdescription: material.description,
                                          vvideo: material.url,
                                        })
                                      }
                                    }}
                                  >
                                    <PopoverTrigger>
                                      <Button isIconOnly size="sm" variant="light">
                                        <Edit size={14} />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-3 sm:p-4 w-[280px] sm:w-[320px] max-w-[95vw]">
                                      <div className="flex flex-col gap-3">
                                        <FileUploader
                                          data={{ file: pdfData?.vvideo }}
                                          label="PDF URL"
                                          placeholder="Enter PDF URL"
                                          onUploadComplete={(url) => setPDFData((prev) => ({ ...prev, vvideo: url }))}
                                        />
                                        <Input
                                          value={pdfData?.vtitle}
                                          label="PDF Title"
                                          placeholder="Enter PDF Title"
                                          onChange={(e) => setPDFData((prev) => ({ ...prev, vtitle: e.target.value }))}
                                        />
                                        <Textarea
                                          value={pdfData?.vdescription}
                                          label="PDF Description (optional)"
                                          placeholder="Enter PDF Description (optional)"
                                          onChange={(e) =>
                                            setPDFData((prev) => ({ ...prev, vdescription: e.target.value }))
                                          }
                                        />
                                        <Button
                                          color="primary"
                                          size="sm"
                                          onClick={() => updatePDFMaterial(pdfData, material.id)}
                                        >
                                          Update
                                        </Button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    color="danger"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deletePDFMaterial(material.id)
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}

                      {(!pdfMaterial || pdfMaterial.filter((m) => m.parent === category.id).length === 0) && (
                        <div className="text-sm text-gray-500 p-2">No PDFs found</div>
                      )}

                      {type === "admin" && (
                        <Popover placement="bottom">
                          <PopoverTrigger>
                            <Button
                              size="sm"
                              variant="flat"
                              color="primary"
                              className="mt-2"
                              startContent={<Plus size={14} />}
                            >
                              Add PDF
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-3 sm:p-4 w-[280px] sm:w-[320px] max-w-[95vw]">
                            <div className="flex flex-col gap-3">
                              <FileUploader
                                data={{ file: pdfData?.vvideo }}
                                label="PDF URL"
                                placeholder="Enter PDF URL"
                                onUploadComplete={(url) => setPDFData((prev) => ({ ...prev, vvideo: url }))}
                              />
                              <Input
                                label="PDF Title"
                                placeholder="Enter PDF Title"
                                onChange={(e) => setPDFData((prev) => ({ ...prev, vtitle: e.target.value }))}
                              />
                              <Textarea
                                label="PDF Description"
                                placeholder="Enter PDF Description"
                                onChange={(e) => setPDFData((prev) => ({ ...prev, vdescription: e.target.value }))}
                              />
                              <Button color="primary" onClick={() => addPDFMaterial(pdfData, category.id)}>
                                Add PDF
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </AccordionItem>
                ))}
            </Accordion>

            {pdfCategories.length === 0 && !isLoading && (
              <div className="text-center p-4 text-gray-500">No categories found</div>
            )}
          </div>
        </div>

        {/* PDF Viewer */}
        <div
          className={`w-full lg:w-2/3 xl:w-3/4 h-[calc(100vh-60px)] lg:h-full flex flex-col p-3 bg-gray-50 transition-all duration-300 ${
            sidebarOpen ? "opacity-25 lg:opacity-100" : "opacity-100"
          }`}
        >
          {activePDFMaterial ? (
            <>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2 bg-white p-3 rounded-lg shadow-sm">
                <h2 className="text-lg font-bold truncate">{activePDFMaterial.title}</h2>
                <div className="flex items-center gap-1">
                  <Button
                    isIconOnly
                    size="sm"
                    color="primary"
                    isDisabled={pageNumber <= 1}
                    onClick={previousPage}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </Button>
                  <span className="text-xs sm:text-sm px-2">
                    {pageNumber} / {numPages}
                  </span>
                  <Button
                    isIconOnly
                    size="sm"
                    color="primary"
                    isDisabled={pageNumber >= numPages}
                    onClick={nextPage}
                    aria-label="Next page"
                  >
                    <ChevronRight size={16} />
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-auto flex justify-center bg-white rounded-lg shadow-sm">
                <Document
                  file={activePDFMaterial.url}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={
                    <div className="flex justify-center items-center h-full">
                      <Spinner size="lg" />
                    </div>
                  }
                  error={
                    <div className="flex justify-center items-center h-full text-red-500 p-4 text-center text-sm">
                      Failed to load PDF. Please check the URL and try again.
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    width={Math.min(600, window.innerWidth * 0.9)}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    scale={1}
                  />
                </Document>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-gray-500 bg-white rounded-lg shadow-sm">
              <FileText size={48} className="text-gray-300 mb-4" />
              <p className="text-lg font-medium">No PDF Selected</p>
              <p className="text-sm">Select a document from the sidebar to view</p>
              {window.innerWidth < 1024 && !sidebarOpen && (
                <Button
                  color="primary"
                  variant="flat"
                  className="mt-4"
                  onClick={() => setSidebarOpen(true)}
                  startContent={<Menu size={16} />}
                >
                  Open Document List
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
