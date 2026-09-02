/**
 * Curated descents from a famous result toward the axioms. Each step names a Mathlib declaration
 * (its page supplies the statement) and says in a few words why it is on the path. Every name here
 * was checked against the v4.33.0 extraction.
 */
export type TourStep = { name: string; note: string };
export type Tour = { slug: string; title: string; lede: string; steps: TourStep[] };

export const TOURS: Tour[] = [
  {
    slug: "bertrand",
    title: "What does Bertrand's postulate rest on?",
    lede:
      "For every positive n there is a prime between n and 2n. Mathlib proves it the way Erdős did: if no such prime existed, the central binomial coefficient (2n choose n) would be too small. Follow the chain from the theorem down to the definition of a prime.",
    steps: [
      { name: "Nat.bertrand", note: "The theorem: a prime p with n < p ≤ 2n exists for every positive n." },
      { name: "Nat.exists_prime_lt_and_le_two_mul", note: "The working statement. Small n are checked by hand; large n go to the next step." },
      { name: "Nat.exists_prime_lt_and_le_two_mul_eventually", note: "The case n ≥ 512, argued by contradiction from the two bounds that follow." },
      { name: "centralBinom_le_of_no_bertrand_prime", note: "If no prime lay in (n, 2n], the central binomial coefficient would be bounded above by a product that is too small." },
      { name: "bertrand_main_inequality", note: "The numerical inequality that makes the contradiction bite for n ≥ 512." },
      { name: "Nat.four_pow_lt_mul_centralBinom", note: "The lower bound: 4^n is less than n times the central binomial coefficient." },
      { name: "primorial_le_4_pow", note: "The product of all primes up to n is at most 4^n, the upper-bound ingredient." },
      { name: "Nat.factorization_centralBinom_of_two_mul_self_lt_three_mul", note: "Primes between 2n/3 and n do not divide the central binomial coefficient at all." },
      { name: "Nat.centralBinom", note: "The central binomial coefficient, the object the whole argument is about." },
      { name: "Nat.factorization", note: "The exponent of each prime in a number, the bookkeeping tool of the proof." },
      { name: "Nat.Prime", note: "What a prime is. Below this there are only the natural numbers and the axioms." },
    ],
  },
];

export function tourBySlug(slug: string): Tour | undefined {
  return TOURS.find((t) => t.slug === slug);
}
