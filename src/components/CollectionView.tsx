import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ExternalLink, Tag, Calendar, ShieldCheck, RefreshCw } from 'lucide-react';
import { ImageFile } from '../types';

interface CollectionViewProps {
    images: ImageFile[];
    onRemove?: (id: string) => void;
    onReprocess?: (id: string) => void;
    onReprocessAll?: () => void;
}

export default function CollectionView({ images, onRemove, onReprocess, onReprocessAll }: CollectionViewProps) {
    if (images.length === 0) {
        return (
            <div className="max-w-7xl mx-auto p-6 text-center py-24">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass-card rounded-[3rem] p-12 inline-block"
                >
                    <Tag className="w-16 h-16 text-gray-300 mx-auto mb-6" />
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Your Collection is Empty</h2>
                    <p className="text-gray-400 font-medium max-w-md mx-auto">
                        Process items in the Image Processor and transfer them here to start your digital archive.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-12">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black premium-gradient-text mb-2">My Collection</h2>
                    <p className="text-gray-500 font-medium">Your curated archive of {images.length} items</p>
                </div>
                {onReprocessAll && (
                    <button
                        onClick={onReprocessAll}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reprocess All
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <AnimatePresence mode="popLayout">
                    {images.map((image, index) => {
                        const details = image.geminiAnalysis?.collectibleDetails;

                        return (
                            <motion.div
                                key={image.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ delay: index * 0.1 }}
                                className="glass-card rounded-[2.5rem] overflow-hidden flex flex-col sm:flex-row h-full group"
                            >
                                <div className="sm:w-1/2 aspect-square relative bg-gray-900">
                                    <img
                                        src={image.result || image.preview}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                                        alt=""
                                    />
                                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full border border-white/20">
                                        ID: {image.id.toUpperCase()}
                                    </div>
                                </div>

                                <div className="p-8 sm:w-1/2 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full border border-purple-100 italic w-fit">
                                                    {details?.type || 'Collectible'}
                                                </span>
                                                {image.side !== 'none' && (
                                                    <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 w-fit">
                                                        {image.side.toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                {onReprocess && (
                                                    <button
                                                        onClick={() => onReprocess(image.id)}
                                                        className="p-2 text-blue-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onRemove?.(image.id)}
                                                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-black text-gray-800 mb-2 truncate" title={image.file.name}>
                                            {image.file.name}
                                        </h3>

                                        <p className="text-sm text-gray-500 line-clamp-3 mb-6">
                                            {image.geminiAnalysis?.description || 'No description provided by AI.'}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                                    <Calendar className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold uppercase">Era</span>
                                                </div>
                                                <p className="text-xs font-black text-gray-700">{details?.era || 'Unknown'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
                                                <div className="flex items-center gap-2 text-gray-400 mb-1">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold uppercase">Rank</span>
                                                </div>
                                                <p className="text-xs font-black text-gray-700">{details?.rarity || 'Common'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                                        <div className="text-2xl font-black premium-gradient-text">
                                            ${details?.estimatedValue?.toLocaleString() || '---'}
                                        </div>
                                        <button className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:underline">
                                            View full analysis <ExternalLink className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </div>
    );
}
