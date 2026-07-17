"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface CreditCard {
  id: string;
  name: string;
  issuer: string;
  network: string;
  annual_fee: number;
  signup_bonus_points: number;
}

interface UserCard {
  id: string;
  card_id: string;
  date_opened: string;
  cards: CreditCard;
}

export default function CardsPage() {
  const [availableCards, setAvailableCards] = useState<CreditCard[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState("");
  const [dateOpened, setDateOpened] = useState("");

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const { data: allCards } = await supabase
      .from("cards")
      .select("*")
      .eq("is_active", true)
      .order("name");

    const { data: myCards } = await supabase
      .from("user_cards")
      .select("*, cards(*)")
      .eq("is_active", true);

    setAvailableCards(allCards || []);
    setUserCards((myCards as unknown as UserCard[]) || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCard) return;

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("user_cards").insert({
      user_id: user.user.id,
      card_id: selectedCard,
      date_opened: dateOpened || null,
    });

    if (!error) {
      setSelectedCard("");
      setDateOpened("");
      fetchData();
    }
  }

  async function removeCard(id: string) {
    const { error } = await supabase
      .from("user_cards")
      .update({ is_active: false })
      .eq("id", id);
    if (!error) fetchData();
  }

  const userCardIds = new Set(userCards.map((uc) => uc.card_id));

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="h-8 w-64 animate-pulse rounded bg-secondary" />
          <div className="mt-8 h-32 animate-pulse rounded-lg bg-secondary" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
          Wallet
        </p>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl">Your cards</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Just the names — never numbers. Knowing which cards you hold tells
          the engine which transfer partners and portals you can use.
        </p>

        <Card className="mt-8">
          <CardContent className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-xl">Add a card</h2>
            <form
              onSubmit={addCard}
              className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"
            >
              <div>
                <Label htmlFor="card">Card</Label>
                <Select
                  id="card"
                  value={selectedCard}
                  onChange={(e) => setSelectedCard(e.target.value)}
                  required
                >
                  <option value="">Select card</option>
                  {availableCards
                    .filter((card) => !userCardIds.has(card.id))
                    .map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} (${card.annual_fee}/yr)
                      </option>
                    ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="opened">Date opened (optional)</Label>
                <Input
                  id="opened"
                  type="date"
                  value={dateOpened}
                  onChange={(e) => setDateOpened(e.target.value)}
                />
              </div>
              <Button type="submit">Add card</Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="font-display text-xl">In your wallet</h2>
          {userCards.length === 0 ? (
            <p className="mt-3 text-muted-foreground">
              No cards yet. Add the cards you hold to unlock their transfer
              partners in your playbooks.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {userCards.map((userCard) => (
                <Card key={userCard.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {userCard.cards.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {userCard.cards.issuer} · {userCard.cards.network}
                        {userCard.date_opened &&
                          ` · opened ${new Date(
                            userCard.date_opened
                          ).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono font-semibold">
                          ${userCard.cards.annual_fee}/yr
                        </p>
                        {userCard.cards.signup_bonus_points > 0 && (
                          <Badge tone="success" className="mt-1">
                            {userCard.cards.signup_bonus_points.toLocaleString()}{" "}
                            pt bonus
                          </Badge>
                        )}
                      </div>
                      <button
                        onClick={() => removeCard(userCard.id)}
                        className="text-sm text-destructive transition-colors hover:text-destructive/80"
                      >
                        Remove
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
