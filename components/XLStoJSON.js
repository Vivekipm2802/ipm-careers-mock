"use client"

import { useState, useRef } from "react"
import * as XLSX from "xlsx"




import { Check, Upload, FileSpreadsheet } from "lucide-react"
import { Button, Card, CardBody, CardHeader } from "@nextui-org/react"

export default function XLStoJSON({ onParseComplete }){
  const [isUploaded, setIsUploaded] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const sheet = workbook.Sheets[sheetName]
      const parsedData = XLSX.utils.sheet_to_json(sheet)

      // Extract required fields
      const formattedData = parsedData.map((row) => ({
        email: row.email || row["Email"] || "",
        password: row.password || row["Password"] || "",
        city: row.city || row["City"] || "",
        role: row.role || row["Role"] || "",
        full_name: row.full_name || row.name || row["Fullname"] || row["Name"] || "",
      }))

      onParseComplete(formattedData)
      setIsUploaded(true)
    }
    reader.readAsArrayBuffer(file)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleDownloadSample = () => {
    const sampleData = [
      { Email: "user1@example.com", Password: "password1", City: "New York", Role: "User", Fullname: "John Doe" },
      { Email: "user2@example.com", Password: "password2", City: "London", Role: "Admin", Fullname: "Jane Smith" },
    ]

    const ws = XLSX.utils.json_to_sheet(sampleData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Sample")
    XLSX.writeFile(wb, "sample_upload.xlsx")
  }

  return (
    <Card shadow="none" className="w-full border-1 my-4 shadow-md">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Upload XLSX File</h3>
            <p className="text-sm text-muted-foreground">Upload your XLSX file or download a sample</p>
          </div>
          <Button variant="outline" className="border-1" size="sm" onClick={handleDownloadSample}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Download Sample
          </Button>
        </div>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isUploaded ? "border-green-500 bg-green-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onClick={handleUploadClick}
        >
          {isUploaded ? (
            <div className="flex items-center justify-center text-green-500">
              <Check className="w-6 h-6 mr-2" />
              <span>File Uploaded Successfully</span>
            </div>
          ) : (
            <div className="text-gray-500">
              <Upload className="w-6 h-6 mx-auto mb-2" />
              <span>Click to upload or drag and drop</span>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx" onChange={handleFileUpload} className="hidden" />
        </div>
      </CardBody>
    </Card>
  )
}

