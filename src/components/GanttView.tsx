import React from "react";
import { Job, Employee } from "../types";

export function GanttView({
    jobs,
    onJobClick,
}: {
    jobs: Job[];
    onJobClick: (jobId: string) => void;
}) {
    // Sort jobs by due date
    const sortedJobs = [...jobs].sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
    });

    // Calculate global date range for the timeline
    let earliestDate = new Date();
    let latestDate = new Date();

    if (sortedJobs.length > 0) {
        earliestDate = new Date(Math.min(...sortedJobs.map(j => new Date(j.createdAt).getTime())));
        latestDate = new Date(Math.max(...sortedJobs.map(j => j.dueDate ? new Date(j.dueDate).getTime() : new Date().getTime() + 86400000 * 30)));

        // Add some padding (e.g., 7 days before and after)
        earliestDate.setDate(earliestDate.getDate() - 7);
        latestDate.setDate(latestDate.getDate() + 14);
    }

    const totalDays = Math.ceil((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));

    // Generate array of months across the range for the header
    const getMonthsInRange = () => {
        const months = [];
        let current = new Date(earliestDate);
        while (current <= latestDate) {
            months.push({
                label: current.toLocaleString('default', { month: 'short', year: 'numeric' }),
                date: new Date(current)
            });
            current.setMonth(current.getMonth() + 1);
        }
        return months;
    };

    const getJobPosition = (job: Job) => {
        const start = new Date(job.createdAt).getTime();
        const end = job.dueDate ? new Date(job.dueDate).getTime() : new Date().getTime() + 86400000 * 7;

        const leftPercent = Math.max(0, ((start - earliestDate.getTime()) / (latestDate.getTime() - earliestDate.getTime())) * 100);
        const widthPercent = Math.min(100 - leftPercent, ((end - start) / (latestDate.getTime() - earliestDate.getTime())) * 100);

        return { left: `${leftPercent}%`, width: `${widthPercent}%` };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "request": return "bg-blue-400";
            case "estimation": return "bg-yellow-400";
            case "in-progress": return "bg-purple-400";
            case "review": return "bg-orange-400";
            case "invoiced": return "bg-indigo-400";
            case "completed": return "bg-green-400";
            case "paid": return "bg-emerald-400";
            default: return "bg-slate-400";
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-160px)] flex flex-col">
            {/* Timeline Header */}
            <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-10">
                <div className="w-64 shrink-0 border-r border-slate-200 p-4 font-bold text-slate-700">
                    Job Title & Client
                </div>
                <div className="flex-1 overflow-hidden relative min-w-[600px]">
                    <div className="absolute inset-x-0 bottom-0 h-8 flex text-xs font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100">
                        {getMonthsInRange().map((month, i) => (
                            <div key={i} className="flex-1 border-r border-slate-200/50 px-2 py-1 truncate">
                                {month.label}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline Body */}
            <div className="flex-1 overflow-y-auto">
                {sortedJobs.map((job) => {
                    const { left, width } = getJobPosition(job);
                    return (
                        <div key={job.id} className="flex border-b border-slate-100 hover:bg-slate-50 group transition-colors">
                            <div
                                className="w-64 shrink-0 border-r border-slate-200 p-4 cursor-pointer"
                                onClick={() => onJobClick(job.id)}
                            >
                                <p className="font-semibold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{job.title}</p>
                                <p className="text-xs text-slate-500 truncate">{job.client}</p>
                            </div>
                            <div className="flex-1 relative min-w-[600px] py-4 px-2">
                                {/* Background Grid Lines Optional */}
                                {/* Job Bar */}
                                <div
                                    className={`absolute h-8 rounded-md shadow-sm ${getStatusColor(job.status)} hover:ring-2 hover:ring-offset-1 hover:ring-indigo-500 transition-all cursor-pointer flex items-center px-2 overflow-hidden min-w-[40px]`}
                                    style={{ left, width }}
                                    onClick={() => onJobClick(job.id)}
                                    title={`${job.title} - ${job.status}`}
                                >
                                    <span className="text-xs font-bold text-white/90 truncate mix-blend-luminosity">
                                        {job.status.replace("-", " ").toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
