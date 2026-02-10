import { Card, CardBody, Skeleton } from "@heroui/react";
import { TrendingUp, AlertTriangle, Calendar } from "lucide-react";

interface StatCardsProps {
    loading: boolean;
    activeCount: number;
    highPriorityCount: number;
    peakCount: number;
}

export const StatCards = ({ loading, activeCount, highPriorityCount, peakCount }: StatCardsProps) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-sm border-none bg-primary/5">
                <CardBody className="flex-row items-center gap-4 p-5">
                    <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-primary/60 uppercase tracking-widest">Active Trends</p>
                        <h3 className="text-3xl font-black text-primary">
                            {loading ? <Skeleton className="w-12 h-8 rounded-lg" /> : activeCount}
                        </h3>
                    </div>
                </CardBody>
            </Card>

            <Card className="shadow-sm border-none bg-danger/5">
                <CardBody className="flex-row items-center gap-4 p-5">
                    <div className="p-3 rounded-2xl bg-danger/10 text-danger">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-danger/60 uppercase tracking-widest">High Priority</p>
                        <h3 className="text-3xl font-black text-danger">
                            {loading ? <Skeleton className="w-12 h-8 rounded-lg" /> : highPriorityCount}
                        </h3>
                    </div>
                </CardBody>
            </Card>

            <Card className="shadow-sm border-none bg-success/5">
                <CardBody className="flex-row items-center gap-4 p-5">
                    <div className="p-3 rounded-2xl bg-success/10 text-success">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-success/60 uppercase tracking-widest">At Peak Now</p>
                        <h3 className="text-3xl font-black text-success">
                            {loading ? <Skeleton className="w-12 h-8 rounded-lg" /> : peakCount}
                        </h3>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
};
