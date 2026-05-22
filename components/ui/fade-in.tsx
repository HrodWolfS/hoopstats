"use client";

import { motion } from "framer-motion";

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
};

/** Anime l'entrée d'une section avec fade + léger glissement vers le haut. */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className = "",
}: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Anime une liste d'enfants en cascade (stagger). */
export function StaggerList({
  children,
  className = "",
  staggerDelay = 0.05,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: { staggerChildren: staggerDelay },
        },
        hidden: {},
      }}
    >
      {children}
    </motion.div>
  );
}

/** Enfant à utiliser dans StaggerList. */
export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.25, ease: "easeOut" },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
