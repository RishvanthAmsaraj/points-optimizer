"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Card {
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
  cards: Card;
}

export default function CardsPage() {
  const [availableCards, setAvailableCards] = useState<Card[]>([]);
  const [userCards, setUserCards] = useState<UserCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState("");
  const [dateOpened, setDateOpened] = useState("");

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
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
    setUserCards(myCards || []);
    setLoading(false);
  }

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

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">Your Card Wallet</h1>

        {/* Add Card Form */}
        <div className="rounded-lg border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Add a Card</h2>
          <form onSubmit={addCard} className="flex gap-4">
            <select
              value={selectedCard}
              onChange={(e) => setSelectedCard(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2"
              required
            >
              <option value="">Select Card</option>
              {availableCards
                .filter((card) => !userCardIds.has(card.id))
                .map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} (${card.annual_fee}/yr)
                  </option>
                ))}
            </select>
            <input
              type="date"
              value={dateOpened}
              onChange={(e) => setDateOpened(e.target.value)}
              className="w-40 rounded-md border border-input bg-background px-3 py-2"
              placeholder="Date Opened"
            />
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
            >
              Add
            </button>
          </form>
        </div>

        {/* User's Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Cards</h2>
          {userCards.length === 0 ? (
            <p className="text-muted-foreground">
              No cards added yet. Add your credit cards to get personalized recommendations.
            </p>
          ) : (
            userCards.map((userCard) => (
              <div
                key={userCard.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{userCard.cards.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {userCard.cards.issuer} · {userCard.cards.network}
                  </p>
                  {userCard.date_opened && (
                    <p className="text-sm text-muted-foreground">
                      Opened: {new Date(userCard.date_opened).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">${userCard.cards.annual_fee}/yr</p>
                    {userCard.cards.signup_bonus_points > 0 && (
                      <p className="text-sm text-green-600">
                        {userCard.cards.signup_bonus_points.toLocaleString()} pts bonus
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeCard(userCard.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
