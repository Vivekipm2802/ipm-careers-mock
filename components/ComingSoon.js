import React from "react";

/**
 * ComingSoon Component
 * A reusable component to display a "Coming Soon" message for features under development
 *
 * @param {Object} props - Component props
 * @param {string} props.title - The title of the feature (default: "Coming Soon!")
 * @param {string} props.message - The description message about the feature
 * @param {string} props.badgeText - Text to display in the badge (default: "Stay tuned for updates")
 * @param {string} props.iconColor - Tailwind color class for the clock icon (default: "text-yellow-500")
 * @param {string} props.badgeColor - Tailwind color classes for the badge (default: "bg-yellow-100 text-yellow-800")
 */
export default function ComingSoon({
  title = "Coming Soon!",
  message = "This feature is currently under development. We're working hard to bring you this amazing feature soon!",
  badgeText = "Stay tuned for updates",
  iconColor = "text-yellow-500",
  badgeColor = "bg-yellow-100 text-yellow-800",
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="text-center max-w-md">
        {/* Clock Icon */}
        <div className="mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-24 h-24 mx-auto ${iconColor}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-gray-800 mb-4">{title}</h2>

        {/* Message */}
        <p className="text-gray-600 mb-6">{message}</p>

        {/* Badge */}
        <div
          className={`inline-flex items-center px-4 py-2 ${badgeColor} rounded-full`}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          {badgeText}
        </div>
      </div>
    </div>
  );
}
