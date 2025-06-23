"use client"

import { motion } from "framer-motion"
import { useState } from "react"





export default function LearningPath({topics}) {
  const [selectedPriority, setSelectedPriority] = useState(-1)

  const priorities = ['High','Medium','Low']
  const filteredTopics =
    selectedPriority === -1 ? topics : topics.filter((topic) => topic.priority === selectedPriority)
    

  return (
    <div className="min-h-screen bg-gray-50 rounded-xl py-12 px-4 sm:px-6 lg:px-8">
      <div className=" mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">Your Learning Journey</h1>

        <div className="mb-6 flex justify-center space-x-4">
          {["All", "High", "Medium", "Low"].map((priority,index) => (
            <button
              key={priority}
              onClick={() => setSelectedPriority(index-1)}
              className={`px-4 py-2 rounded-md ${
                selectedPriority === index-1 ? "bg-primary shadow-lg shadow-primary/50 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {priority}
            </button>
          ))}
        </div>
        {filteredTopics && filteredTopics?.length == 0 && <div className="px-8 py-4 flex flex-col items-center justify-center bg-gray-100 rounded-xl border-dashed w-full border-1 border-gray-200">No Topic Found</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          
          {filteredTopics.map((topic, index) => (
            <motion.div
              key={topic.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-md overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-primary mb-2">{topic.module.title}</h2>
                <p className="text-sm text-gray-600 mb-4">Priority: {priorities[topic.priority]}</p>
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      topic.status === "Completed"
                        ? "bg-green-100 text-green-800"
                        : topic.status === "Passed"
                          ? "bg-primary-100 text-primary-800"
                          : topic.status === "Started"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {topic.status}
                  </span>
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        topic.status === "Completed"
                          ? "bg-green-500 w-full"
                          : topic.status === "Passed"
                            ? "bg-primary-500 w-3/4"
                            : topic.status === "Started"
                              ? "bg-yellow-500 w-1/2"
                              : "bg-gray-300 w-1/4"
                      }`}
                    ></div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

