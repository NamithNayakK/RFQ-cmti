import { FiSend, FiCheckCircle, FiClock, FiTruck } from 'react-icons/fi';

const steps = [
  { key: 'sent', label: 'Quote Sent', icon: FiSend },
  { key: 'accepted', label: 'Accepted', icon: FiCheckCircle },
  { key: 'in_production', label: 'In Production', icon: FiClock },
  { key: 'shipped', label: 'Shipped', icon: FiTruck },
];

function getCurrentStep(status) {
  switch ((status || '').toLowerCase()) {
    case 'sent':
      return 0;
    case 'accepted':
      return 1;
    case 'in production':
    case 'in_production':
      return 2;
    case 'shipped':
      return 3;
    default:
      return 0;
  }
}

export default function QuoteOrderProgressBar({ status }) {
  const currentStep = getCurrentStep(status);
  return (
    <div className="flex items-center justify-between w-full max-w-md mx-auto my-2">
      {steps.map((step, idx) => {
        const Icon = step.icon;
        const isActive = idx <= currentStep;
        return (
          <div key={step.key} className="flex-1 flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 border-2 transition-all
                ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-300'}`}
            >
              <Icon size={16} />
            </div>
            <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{step.label}</span>
            {idx < steps.length - 1 && (
              <div className={`h-1 w-full mt-1 ${isActive && idx < currentStep ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
