import React, { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface QuickMessageTemplatesProps {
  customerPhone: string | null;
  customerName: string;
}

const QUICK_MESSAGES = [
  { id: 1, text: "Arriving in 5 minutes", icon: "🚗" },
  { id: 2, text: "I'm outside", icon: "📍" },
  { id: 3, text: "Waiting for you", icon: "⏰" },
  { id: 4, text: "Running 2 minutes late", icon: "⏱️" },
  { id: 5, text: "Can't find you, please call", icon: "📞" },
  { id: 6, text: "On my way!", icon: "🛣️" },
];

const QuickMessageTemplates: React.FC<QuickMessageTemplatesProps> = ({
  customerPhone,
  customerName
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSendMessage = (message: string) => {
    if (!customerPhone) {
      toast.error('Customer phone number not available');
      return;
    }

    // Format phone number for WhatsApp (remove spaces and special chars)
    const cleanPhone = customerPhone.replace(/[^0-9]/g, '');
    
    // Open WhatsApp with pre-filled message
    const whatsappMessage = encodeURIComponent(`Hi ${customerName}, ${message}`);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;
    
    window.open(whatsappUrl, '_blank');
    toast.success('Opening WhatsApp...');
    setIsOpen(false);
  };

  const handleCall = () => {
    if (!customerPhone) {
      toast.error('Customer phone number not available');
      return;
    }
    
    window.location.href = `tel:${customerPhone}`;
    toast.info('Opening dialer...');
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <Button
        variant="outline"
        className="w-full border-primary/50 text-primary hover:bg-primary/10"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        {isOpen ? 'Close Messages' : 'Quick Messages'}
      </Button>

      {/* Messages Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-10 left-0 right-0 mt-2 bg-card border-2 border-primary/30 rounded-xl shadow-elevated p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-foreground text-sm">Select a Message</h4>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {QUICK_MESSAGES.map((msg, index) => (
                <motion.button
                  key={msg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSendMessage(msg.text)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-xl">{msg.icon}</span>
                      <span className="text-sm font-medium text-foreground">
                        {msg.text}
                      </span>
                    </div>
                    <Send className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Call Button */}
            <div className="mt-3 pt-3 border-t border-border">
              <Button
                variant="outline"
                className="w-full border-green-500 text-green-600 hover:bg-green-500/10"
                onClick={handleCall}
              >
                <span className="text-xl mr-2">📞</span>
                Call Customer
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuickMessageTemplates;
