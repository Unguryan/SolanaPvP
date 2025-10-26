// 404 Not Found page component
import React from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { Button } from "@/components/common/Button";

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300 dark:text-gray-600">
            404
          </h1>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Page Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Link to={ROUTES.HOME}>
          <Button size="lg">Go Home</Button>
        </Link>
      </div>
    </div>
  );
};
