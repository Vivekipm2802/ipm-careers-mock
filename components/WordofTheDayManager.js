import { useState, useEffect } from "react"
import { Button, Input, Table, Modal, TableHeader, ModalHeader, ModalFooter, ModalContent, ModalBody, TableBody, TableRow, TableCell, TableColumn } from "@nextui-org/react"
import { supabase } from "@/utils/supabaseClient"
import { CtoLocal } from "@/utils/DateUtil"
import { toast } from "react-hot-toast"
import axios from "axios"
import { Check, Edit2, Sparkle, Trash2 } from "lucide-react"




export default function WordManager() {
  const [words, setWords] = useState([])
  const [newWord, setNewWord] = useState({ word: "", meaning: "" })
  const [editingWord, setEditingWord] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGenerating,setGenerating] = useState(false)

  useEffect(() => {
    fetchWords()
  }, [])

  async function fetchWords() {
    const r = toast.loading('Loading Words...');
    try {
      const response = await axios.get('/api/getWords');
      setWords(response.data.words || []);
      toast.dismiss(r);
    } catch (error) {
      toast.dismiss(r);
      toast.error('Error Loading Words');
      console.error('Error fetching words:', error);
    }
  }

  

  async function addWord() {
    const latestDate = words[0]?.date || new Date().toISOString().split("T")[0]
    const nextDate = new Date(latestDate)
    nextDate.setDate(nextDate.getDate() + 1)

    const { data, error } = await supabase
      .from("word_of_the_day")
      .insert([{ ...newWord, date: nextDate.toISOString().split("T")[0] }])
    if (error) console.error("Error adding word:", error)
    else {
      setNewWord({ word: "", meaning: "" })
      fetchWords()
    }
  }

 

  async function updateWord() {
    if (!editingWord) return;
    try {
      const { data } = await axios.put('/api/getWords', editingWord);
      setEditingWord(null);
      setIsModalOpen(false);
      fetchWords();
    } catch (error) {
      console.error('Error updating word:', error.response?.data?.error || error.message);
    }
  }
  
  async function deleteWord(id) {
    try {
      const { data } = await axios.delete('/api/getWords', { data: { id } });
      fetchWords();
    } catch (error) {
      console.error('Error deleting word:', error.response?.data?.error || error.message);
    }
  }

  

  async function generateWord() {
    const r = toast.loading('Generating Word....');
    setGenerating(true);
    try {
      const response = await fetch('/api/generateWord', {
        method: 'POST',
      });
      const result = await response.json();
  
      toast.remove(r);
      if (result.success) {
        toast.success('Generated Word Successfully');
        fetchWords();
      } else {
        toast.error(result.message || 'Error Generating Word');
      }
    } catch (error) {
      toast.remove(r);
      toast.error('Error Generating Word');
    } finally {
      setGenerating(false);
    }
  }
  

  return (
    <div className="container flex flex-col items-start justify-start mx-auto p-4 overflow-hidden flex-1 h-full">
      <Button  size="sm"  endContent={<Sparkle size={16} fill="white" className="rotate-45 "></Sparkle>} isLoading={isGenerating} onClick={generateWord} className="mb-4 bg-gradient-purple text-white">
        Auto Generate Word
      </Button>

      <div className="flex mb-4 p-4 border-1 rounded-xl ">
        <Input
          placeholder="Word"
          value={newWord.word}
          onChange={(e) => setNewWord({ ...newWord, word: e.target.value })}
          className="mr-2"
        />
        <Input
          placeholder="Meaning"
          value={newWord.meaning}
          onChange={(e) => setNewWord({ ...newWord, meaning: e.target.value })}
          className="mr-2"
        />
        <Button color="success" onClick={addWord}>
          Add Word
        </Button>
      </div>

<div className="w-full h-full overflow-auto p-2 flex-1">
      <Table
      shadow="sm"
      
        aria-label="Word of the Day table"
        css={{
          height: "auto",
          minWidth: "100%",
        }}
      >
        <TableHeader>
        <TableColumn>Date</TableColumn>
          <TableColumn>Word</TableColumn>
          <TableColumn>Meaning</TableColumn>
        
          <TableColumn>Actions</TableColumn>
        </TableHeader>
        <TableBody>
          {words.map((word) => (
            <TableRow key={word.id}>
                  <TableCell>
                    <div className="flex bg-green-50 rounded-xl p-2 flex-col items-center justify-center text-center">
                        <h2 className="text-xl font-bold text-green-500">{CtoLocal(word.date).date}</h2>
                        <p className="text-green-700 text-xs">{CtoLocal(word.date).monthName}</p>
                    </div>
                  </TableCell>
              <TableCell className="font-medium text-black">{word.word}</TableCell>
              <TableCell>{word.meaning}</TableCell>
            
              <TableCell>
                <div className="flex flex-row items-center justify-center">
                <Button
                  color="warning"
                  onClick={() => {
                    setEditingWord(word)
                    setIsModalOpen(true)
                  }}
                   size="sm"
                  className="mr-2" isIconOnly
                >
                  <Edit2 size={16}></Edit2>
                </Button>
                <Button size="sm" isIconOnly color="danger" onClick={() => deleteWord(word.id)}>
                <Trash2 size={16}></Trash2>
                </Button></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
      <ModalContent>
        <ModalHeader>
          <h2 id="modal-title" size={18}>
            Edit Word
          </h2>
        </ModalHeader>
        <ModalBody>
          <Input
            label="Word"
            value={editingWord?.word || ""}
            onChange={(e) => setEditingWord(editingWord ? { ...editingWord, word: e.target.value } : null)}
          />
          <Input
            label="Meaning"
            value={editingWord?.meaning || ""}
            onChange={(e) => setEditingWord(editingWord ? { ...editingWord, meaning: e.target.value } : null)}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" color="danger" size="sm" onClick={() => setIsModalOpen(false)}>
            Close
          </Button>
          <Button size="sm" color="success"  endContent={<Check size={16}></Check>} auto onClick={updateWord}>
            Save
          </Button>
        </ModalFooter></ModalContent>
      </Modal>
    </div>
  )
}

