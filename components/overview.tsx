import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { stepsArray } from "@/constants";

export const Overview = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [currentSteps, setCurrentSteps] = useState(stepsArray[0]);

  useEffect(() => {
    const advanceStep = () => {
      const randomArrayIndex = Math.floor(Math.random() * stepsArray.length);
      setCurrentSteps(stepsArray[randomArrayIndex]);
      setCurrentStep(0);
    };

    const interval = setInterval(() => {
      if (currentStep < currentSteps.length - 1) {
        setCurrentStep((prevStep) => prevStep + 1);
      } else {
        setTimeout(advanceStep, 5000);
      }
    }, 4000);

    return () => {
      clearInterval(interval);
    };
  }, [currentStep, currentSteps]);

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl">
        <div className="g-zinc-950">
          <div className="flex flex-row justify-center gap-4 items-center">
            <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-zinc-400" />
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={currentStep}
                initial={{
                  opacity: 0,
                  y: currentStep === currentSteps.length - 1 ? 0 : 20,
                }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  y: currentStep === currentSteps.length - 1 ? 0 : -20,
                }}
                transition={{ duration: 0.5 }}
                className="text-lg text-zinc-400 font-medium"
              >
                {currentSteps[currentStep]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        <p>
          <Link
            className="font-medium underline underline-offset-4"
            href="https://github.com/reasoner-o1"
            target="_blank"
          >
            Reasoner O1
          </Link>{" "}
          is a powerful AI model delivering high-quality reasoning and responses
          at an affordable cost. Powered by GPT-4o, it excels in logic, context,
          and adaptability—no fine-tuning required.
        </p>
        <p>Unlock the future of AI reasoning now!</p>
      </div>
    </motion.div>
  );
};
