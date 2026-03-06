"use client";

export default function ValidatingUser({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-center min-h-screen pb-64">
            <div className="bg-gray-800 shadow-xl rounded-2xl p-10 text-center">
                <div className="flex justify-center mb-6">
                    <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                    Checking Your Account
                </h2>
                <p className="text-white text-sm">
                    Please wait while we securely set up your account.
                </p>
            </div>
        </div>
    );
}
