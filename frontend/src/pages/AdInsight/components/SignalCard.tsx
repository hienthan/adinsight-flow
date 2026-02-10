import { Card, CardHeader, CardBody, CardFooter, Chip, Badge } from "@heroui/react";
import { Clock, MapPin, ChevronRight } from "lucide-react";
import { TrendSignal, SignalState, Destination } from "../types";
import { getStateColor, getPriorityColor, getCategoryLabel, formatDate } from "../utils";

interface SignalCardProps {
    signal: TrendSignal & { state: SignalState; start: Date; end: Date; pre_alert_date: Date };
    onOpen: (signal: TrendSignal & { state: SignalState; start: Date; end: Date; pre_alert_date: Date }) => void;
}

export const SignalCard = ({ signal, onOpen }: SignalCardProps) => {
    return (
        <Card
            isPressable
            className="bg-white dark:bg-slate-800 border-none shadow-md hover:shadow-xl transition-all h-full"
            onPress={() => onOpen(signal)}
        >
            <CardHeader className="flex justify-between items-start pt-6 px-6">
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                        <Chip
                            size="sm"
                            variant="flat"
                            color={getPriorityColor(signal.priority)}
                            className="font-bold uppercase tracking-wider h-5"
                        >
                            {signal.priority}
                        </Chip>
                        <Chip
                            size="sm"
                            color={getStateColor(signal.state)}
                            className={`font-black uppercase tracking-widest text-[10px] h-5 ${signal.state === 'PEAK' ? 'animate-pulse shadow-lg' : ''}`}
                        >
                            {signal.state.replace('_', ' ')}
                        </Chip>
                    </div>
                    <h4 className="font-extrabold text-xl text-default-800 leading-tight">
                        {signal.expand?.trend_type?.name || signal.key}
                    </h4>
                    <p className="text-[10px] font-mono text-default-400">{signal.key}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <div className="text-sm font-black flex items-center gap-1.5 text-default-600 bg-default-100 p-2 rounded-xl">
                        <Clock size={14} className="text-primary" />
                        <span>{formatDate(signal.start)} - {formatDate(signal.end)}</span>
                    </div>
                    <span className="text-[10px] font-bold text-default-400 uppercase">Alert: {formatDate(signal.pre_alert_date)}</span>
                </div>
            </CardHeader>

            <CardBody className="px-6 py-4 space-y-5">
                <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase text-default-400 flex items-center gap-1">
                        <MapPin size={12} className="text-primary" /> Destinations
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {signal.destinations?.map((dest: string | Destination) => {
                            const label = typeof dest === 'string' ? dest : (dest.name || dest.code || 'Unknown');
                            return (
                                <Chip key={label} variant="bordered" size="sm" className="bg-default-50 border-default-200">
                                    {label}
                                </Chip>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                        {signal.product_types?.map(p => (
                            <Chip key={p} size="sm" color="primary" variant="dot" className="font-bold border-none">
                                {p}
                            </Chip>
                        ))}
                    </div>
                    <Chip size="sm" variant="flat" color="secondary" className="font-bold uppercase h-5 text-[9px]">
                        {getCategoryLabel(signal.expand?.trend_type?.category || '')}
                    </Chip>
                </div>

                {signal.notes && (
                    <div className="bg-warning-50/50 p-3 rounded-xl border-1 border-warning-100 italic text-xs text-warning-700 line-clamp-2">
                        <strong>Note:</strong> {signal.notes}
                    </div>
                )}
            </CardBody>

            <CardFooter className="px-6 py-4 bg-default-50/50 border-t border-default-100 justify-between">
                <Badge color={signal.status === 'active' ? 'success' : 'default'} content="" size="sm" placement="bottom-right">
                    <span className="text-xs font-black uppercase text-default-500">
                        {signal.status}
                    </span>
                </Badge>
                <div
                    className="font-bold text-primary flex items-center gap-1 text-sm bg-primary-100/50 px-2 py-1 rounded-lg"
                >
                    Details <ChevronRight size={14} />
                </div>
            </CardFooter>
        </Card>
    );
};
