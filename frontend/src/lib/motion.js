export function introTextVariants(reduceMotion) {
  return {
    hidden: reduceMotion ? {} : { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.2,
        ease: "easeOut",
      },
    },
  };
}
