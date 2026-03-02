import React from "react";
import { Job } from "../types";
import { Clock, DollarSign, Calendar, History, FileText } from "lucide-react";
import { BusinessSettings } from "./Settings";

export function ClientPortal({
    job,
    settings,
}: {
    job: Job | null;
    settings: BusinessSettings;
}) {
    const [isPaying, setIsPaying] = React.useState(false);
    const [paymentSuccess, setPaymentSuccess] = React.useState(job?.status === "paid");

    const handlePayment = () => {
        setIsPaying(true);
        // Simulate Stripe checkout flow
        setTimeout(() => {
            setIsPaying(false);
            setPaymentSuccess(true);
            // In a real app, this would trigger a webhook to update the backend
            // which would real-time sync with Auvic dashboard
        }, 1500);
    };

    if (!job) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl font-bold">!</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Invalid Link</h2>
                    <p className="text-slate-500">
                        This tracking link has expired or is invalid. Please contact {settings.name}.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {settings.logoUrl && (
                            <img
                                src={settings.logoUrl}
                                alt="Logo"
                                className="h-8 object-contain"
                                referrerPolicy="no-referrer"
                            />
                        )}
                        <span className="font-bold text-slate-900">{settings.name}</span>
                    </div>
                    <div className="text-sm font-medium text-slate-500">Client Portal</div>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-slate-900 mb-2">{job.title}</h1>
                    <p className="text-slate-500">Prepared for {job.client}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Status
                            </p>
                            <p className="font-semibold text-slate-900 capitalize">
                                {job.status.replace("-", " ")}
                            </p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <DollarSign className="w-3 h-3" /> Amount
                            </p>
                            <p className="font-semibold text-slate-900 flex items-center">
                                {job.amount ? job.amount.toLocaleString() : "TBD"}
                            </p>
                        </div>
                        <div className="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Target Date
                            </p>
                            <p className="font-semibold text-slate-900">
                                {job.dueDate
                                    ? new Date(job.dueDate).toLocaleDateString()
                                    : "Not set"}
                            </p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-semibold text-slate-900 mb-2">Scope of Work</h4>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                            {job.description || "No description provided."}
                        </div>
                    </div>

                    {job.status === "invoiced" && job.invoiceNotes && !paymentSuccess && (
                        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-2xl">
                            <div className="flex items-center gap-2 mb-4 text-indigo-700 font-bold">
                                <FileText className="w-5 h-5" />
                                <h3>Invoice Ready</h3>
                            </div>
                            <p className="text-sm text-indigo-900/80 mb-6">
                                Your project has been completed and an invoice has been generated.
                            </p>
                            <button
                                onClick={handlePayment}
                                disabled={isPaying}
                                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
                            >
                                {isPaying ? (
                                    <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                ) : (
                                    <>Pay Now - ${job.amount?.toLocaleString()}</>
                                )}
                            </button>
                            <p className="text-[10px] text-indigo-400 mt-4 text-center sm:text-left flex items-center justify-center sm:justify-start gap-1">
                                Secure payment powered by <strong>Stripe</strong>
                            </p>
                        </div>
                    )}

                    {paymentSuccess && (
                        <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 ring-4 ring-emerald-50">
                                <DollarSign className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-emerald-900 mb-2">Payment Successful!</h3>
                            <p className="text-sm text-emerald-700">
                                Thank you for your business. A receipt has been sent to your email.
                            </p>
                        </div>
                    )}
                </div>

                {job.activityLog && job.activityLog.length > 0 && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h4 className="text-sm font-semibold text-slate-900 mb-6 flex items-center gap-2">
                            <History className="w-4 h-4 text-indigo-500" /> Project Timeline
                        </h4>
                        <div className="space-y-6">
                            {job.activityLog
                                .slice()
                                .reverse()
                                .map((log) => (
                                    <div key={log.id} className="flex gap-4">
                                        <div className="w-2 h-2 rounded-full bg-indigo-400 mt-2 shrink-0 ring-4 ring-indigo-50" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                {log.action}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {new Date(log.timestamp).toLocaleDateString(undefined, {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
