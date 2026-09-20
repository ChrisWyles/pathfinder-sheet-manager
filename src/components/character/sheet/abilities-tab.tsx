import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FavoredClassBonusMechanic } from "@/lib/rules/favored-class-bonus";

export interface CustomCastingTradition {
  drawbacks: string[];
  boons: string[];
  bonusSpellPoints: number;
  sphereDrawbacks: { name: string; sphereName: string }[];
}
export interface CustomMartialTradition {
  equipmentSphere: string;
  disciplineTalent: string | null;
  secondTalent: string | null;
  baseSphere: string | null;
  bonus:
    | { type: "sphere"; name: string }
    | { type: "talent"; name: string; fromSphere: string | null }
    | { type: "equipment"; name: string }
    | null;
}

export function AbilitiesTab({
  customCasting,
  customMartial,
  favoredBonusNote,
  favoredClassName,
  fcbMechanic,
  fcbTalentsEarned,
  fcbNextLevel,
}: {
  customCasting: CustomCastingTradition | null;
  customMartial: CustomMartialTradition | null;
  favoredBonusNote: string;
  favoredClassName?: string;
  fcbMechanic: FavoredClassBonusMechanic | null;
  fcbTalentsEarned: number;
  fcbNextLevel: number | null;
}) {
  const nothing = !customCasting && !customMartial && !favoredBonusNote;

  return (
    <div className="space-y-6">
      {favoredBonusNote && (
        <Card>
          <CardHeader>
            <CardTitle>Favored class bonus</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{favoredBonusNote}</p>
            {fcbMechanic && (
              <p className="text-muted-foreground">
                +1{" "}
                {fcbMechanic.spheres.length
                  ? `${fcbMechanic.spheres.join("/")} sphere `
                  : ""}
                talent every {fcbMechanic.every} levels in {favoredClassName} —{" "}
                <strong>{fcbTalentsEarned}</strong> earned so far
                {fcbNextLevel ? `, next at level ${fcbNextLevel}` : ""}.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {(customCasting || customMartial) && (
        <Card>
          <CardHeader>
            <CardTitle>
              {customCasting && customMartial
                ? "Traditions"
                : customCasting
                  ? "Casting tradition"
                  : "Martial tradition"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {customCasting && (
              <>
                <div>
                  <div className="text-muted-foreground text-xs">
                    Drawbacks
                  </div>
                  {customCasting.drawbacks.length === 0 ? (
                    <p className="text-muted-foreground">None.</p>
                  ) : (
                    <ul className="list-inside list-disc">
                      {customCasting.drawbacks.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Boons</div>
                  {customCasting.boons.length === 0 ? (
                    <p className="text-muted-foreground">None.</p>
                  ) : (
                    <ul className="list-inside list-disc">
                      {customCasting.boons.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
                {customCasting.bonusSpellPoints > 0 && (
                  <p className="text-muted-foreground">
                    +{customCasting.bonusSpellPoints} bonus spell points from
                    unspent drawbacks.
                  </p>
                )}
                {customCasting.sphereDrawbacks.length > 0 && (
                  <div>
                    <div className="text-muted-foreground text-xs">
                      Sphere-specific drawbacks
                    </div>
                    <ul className="list-inside list-disc">
                      {customCasting.sphereDrawbacks.map((d) => (
                        <li key={d.name}>
                          {d.name} ({d.sphereName})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
            {customMartial && (
              <ul className="list-inside list-disc">
                <li>{customMartial.equipmentSphere} sphere (automatic)</li>
                {customMartial.disciplineTalent && (
                  <li>{customMartial.disciplineTalent} (discipline)</li>
                )}
                {customMartial.secondTalent && (
                  <li>{customMartial.secondTalent}</li>
                )}
                {customMartial.baseSphere && (
                  <li>{customMartial.baseSphere} sphere</li>
                )}
                {customMartial.bonus?.type === "sphere" && (
                  <li>{customMartial.bonus.name} sphere (bonus)</li>
                )}
                {customMartial.bonus?.type === "talent" && (
                  <li>
                    {customMartial.bonus.name}
                    {customMartial.bonus.fromSphere
                      ? ` (from ${customMartial.bonus.fromSphere})`
                      : ""}
                  </li>
                )}
                {customMartial.bonus?.type === "equipment" && (
                  <li>{customMartial.bonus.name} (bonus)</li>
                )}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {nothing && (
        <p className="text-muted-foreground text-sm">
          Nothing recorded yet — traditions and favored class bonuses picked
          during character creation show up here.
        </p>
      )}
    </div>
  );
}
