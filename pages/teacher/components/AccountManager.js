

import { useState, useEffect } from 'react'
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@nextui-org/react"
import { Pencil, Trash2, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '@/utils/supabaseClient'
import { toast } from 'react-hot-toast'

// Initialize Supabase client


export default function ZoomManager() {
  const [zoomAccounts, setZoomAccounts] = useState([])
  const [formData, setFormData] = useState({ key: '', secret: '', account_id: '' })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchZoomAccounts()
  }, [])

  async function fetchZoomAccounts() {
    const { data, error } = await supabase
      .from('zoom')
      .select('*')
    if (error) toast.error('Error fetching zoom accounts:', error)
    else setZoomAccounts(data)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (editingId) {
      const { error } = await supabase
        .from('zoom')
        .update(formData)
        .eq('id', editingId)
      if (error) toast.error('Error updating zoom account:', error)
      else {
        setEditingId(null)
        fetchZoomAccounts()
      }
    } else {
      const { error } = await supabase
        .from('zoom')
        .insert(formData)
      if (error) toast.error('Error inserting zoom account:', error)
      
      else fetchZoomAccounts() , toast.success('Added Zoom Account');
    }
    setFormData({ key: '', secret: '', account_id: '' })
    setIsModalOpen(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase
      .from('zoom')
      .delete()
      .eq('id', id)
    if (error) toast.error('Error deleting zoom account:', error)
    else fetchZoomAccounts()
  }

  function handleEdit(account) {
    setFormData(account)
    setEditingId(account.id)
    setIsModalOpen(true)
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <motion.h1 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold mb-4"
      >
        Zoom Account Manager
      </motion.h1>

      <Button 
        color="primary" 
        endContent={<Plus size={16} />}
        onClick={() => setIsModalOpen(true)}
        className="mb-4"
      >
        Add New Account
      </Button>

      <Table aria-label="Zoom accounts table">
        <TableHeader>
          <TableColumn>ACCOUNT ID</TableColumn>
          <TableColumn>KEY</TableColumn>
          <TableColumn>SECRET</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody>
          {zoomAccounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell>{account.account_id}</TableCell>
              <TableCell>{account.key}</TableCell>
              <TableCell>{account.secret.substring(0, 5)}...</TableCell>
              <TableCell>
                <Button 
                  isIconOnly 
                  color="warning" 
                  aria-label="Edit" 
                  className="mr-2"
                  onClick={() => handleEdit(account)}
                >
                  <Pencil size={16} />
                </Button>
                <Button 
                  isIconOnly 
                  color="danger" 
                  aria-label="Delete"
                  onClick={() => handleDelete(account.id)}
                >
                  <Trash2 size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Modal isOpen={isModalOpen} onClose={() => {
        setIsModalOpen(false)
        setFormData({ key: '', secret: '', account_id: '' })
        setEditingId(null)
      }}>
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{editingId ? 'Edit Zoom Account' : 'Add New Zoom Account'}</ModalHeader>
            <ModalBody>
              <Input
                label="Account ID"
                value={formData.account_id}
                onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                className="mb-4"
              />
              <Input
                label="Key"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                className="mb-4"
              />
              <Input
                label="Secret"
                type="password"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
              />
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button color="primary" type="submit">
                {editingId ? 'Update' : 'Save'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  )
}