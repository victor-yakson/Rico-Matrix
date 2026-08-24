"use client";

import { Header } from "../../components/Navigation/Header";
import { GiveawayPool } from "../../components/Giveaway/GiveawayPool";

export default function RewardsPage() {
  return (
    <>
      <Header />
      <div className="theme-shell theme-page-shell">
        <div className="theme-container px-4">
          <div className="mx-auto mb-10 max-w-4xl text-center md:mb-12">
            <p className="theme-kicker justify-center mb-3">
              Rico Giveaway
            </p>
            <h1 className="theme-title mb-3 text-3xl md:text-4xl">
              Claim Your $RICO Rewards
            </h1>
            <p className="theme-copy max-w-2xl mx-auto text-sm md:text-base">
              Sync your Hub history, track your Game of Thrones milestones,
              and claim promotional $RICO cashback and referral bonuses.
            </p>
          </div>

          <GiveawayPool />
        </div>
      </div>
    </>
  );
}
