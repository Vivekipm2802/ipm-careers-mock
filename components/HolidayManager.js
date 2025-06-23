'use client'

import { useState, useEffect } from 'react'
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, Textarea } from '@nextui-org/react'
import { supabase } from '@/utils/supabaseClient'






export default function HolidayManager() {
  const [holidays, setHolidays] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHoliday, setSelectedHoliday] = useState(null)
  const [formData, setFormData] = useState({ date: '', title: '', description: '' })

  useEffect(() => {
    fetchHolidays()
  }, [])

  async function fetchHolidays() {
    setIsLoading(true)
    const { data, error } = await supabase.from('holidays').select('*')
    if (error) {
      console.error('Error fetching holidays:', error)
    } else {
      setHolidays(data)
    }
    setIsLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (selectedHoliday) {
      const { error } = await supabase
        .from('holidays')
        .update(formData)
        .eq('id', selectedHoliday.id)
      if (error) console.error('Error updating holiday:', error)
    } else {
      const { error } = await supabase.from('holidays').insert([formData])
      if (error) console.error('Error adding holiday:', error)
    }
    setIsOpen(false)
    fetchHolidays()
  }

  async function handleDelete(id) {
    if (confirm('Are you sure you want to delete this holiday?')) {
      const { error } = await supabase.from('holidays').delete().eq('id', id)
      if (error) {
        console.error('Error deleting holiday:', error)
      } else {
        fetchHolidays()
      }
    }
  }

  function handleEdit(holiday) {
    setSelectedHoliday(holiday)
    setFormData({ date: holiday.date, title: holiday.title, description: holiday.description })
    setIsOpen(true)
  }

  function handleAdd() {
    setSelectedHoliday(null)
    setFormData({ date: '', title: '', description: '' })
    setIsOpen(true)
  }

  return (
    <div className="container mx-auto p-4 flex flex-col items-start justify-start text-left">
      <h1 className="text-2xl font-bold mb-4">Holiday Manager</h1>
      <Button color="primary" onPress={handleAdd} className="mb-4">
        Add Holiday
      </Button>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <Table aria-label="Holidays table">
          <TableHeader>
            <TableColumn>Date</TableColumn>
            <TableColumn>Title</TableColumn>
            <TableColumn>Description</TableColumn>
            <TableColumn>Actions</TableColumn>
          </TableHeader>
          <TableBody>
            {holidays.map((holiday) => (
              <TableRow key={holiday.id}>
                <TableCell>{new Date(holiday.date).toLocaleDateString()}</TableCell>
                <TableCell>{holiday.title}</TableCell>
                <TableCell>{holiday.description}</TableCell>
                <TableCell>
                  <Button size="sm" color="primary" onPress={() => handleEdit(holiday)} className="mr-2">
                    Edit
                  </Button>
                  <Button size="sm" color="danger" onPress={() => handleDelete(holiday.id)}>
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalContent>
          <form onSubmit={handleSubmit}>
            <ModalHeader>{selectedHoliday ? 'Edit Holiday' : 'Add Holiday'}</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  type="date"
                  label="Date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
                <Input
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
                <Textarea
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="danger" variant="light" onPress={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button color="primary" type="submit">
                {selectedHoliday ? 'Update' : 'Add'} Holiday
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>
    </div>
  )
}