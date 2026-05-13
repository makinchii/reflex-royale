import type { CSSProperties } from "react";
import { HexColorPicker } from "@/components/thegridcn/hex-color-picker";
import { Button } from "@/components/thegridcn/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/thegridcn/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/thegridcn/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/thegridcn/tooltip";
import { PERSONALIZATION_KEYBOARD_ROWS, THEME_COMMANDS } from "@/components/app/dashboard-settings";
import type { ThemeCommandId } from "@/lib/theme-preferences";

export function DashboardPersonalizationSection({
  activeThemeCommand,
  activeThemeShadeColors,
  choosePreferredKey,
  chooseThemeColor,
  chooseThemeCommand,
  chooseThemeFromBlockedColor,
  customThemeColor,
  getColorOwner,
  hoveredThemeCommand,
  onThemeColorHover,
  preferredKey,
  resetThemeShade,
  setSectionRef,
  themeCommand,
  themeShadeSelections,
}: {
  activeThemeCommand: (typeof THEME_COMMANDS)[number];
  activeThemeShadeColors: string[];
  choosePreferredKey: (key: string) => void;
  chooseThemeColor: (color: string) => void;
  chooseThemeCommand: (commandId: ThemeCommandId) => void;
  chooseThemeFromBlockedColor: (color: string, owner: string) => void;
  customThemeColor: string;
  getColorOwner: (color: string) => string | null;
  hoveredThemeCommand: ThemeCommandId | null;
  onThemeColorHover: (owner: string | null) => void;
  preferredKey: string;
  resetThemeShade: () => void;
  setSectionRef: (element: HTMLElement | null) => void;
  themeCommand: ThemeCommandId;
  themeShadeSelections: Record<ThemeCommandId, string>;
}) {
  return (
    <section
      ref={setSectionRef}
      data-section-id="personalization"
      className="dashboard-personalization-section scroll-mt-12 rounded border border-primary/20 bg-card/10 p-4"
    >
      <div className="mb-4 border-b border-primary/20 pb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-primary">Personalization</div>
      <div className="dashboard-personalization-grid grid gap-5 xl:grid-cols-[minmax(340px,0.78fr)_minmax(0,1.22fr)]">
        <Card className="dashboard-panel-card dashboard-personalization-key-panel border-primary/25 bg-card/15 backdrop-blur-xl">
          <CardHeader className="dashboard-panel-card-header">
            <CardTitle className="dashboard-card-glow-title uppercase tracking-[0.08em]">Preferred Key</CardTitle>
            <CardDescription>Your online lobby default. Auto-selects in online lobbies if available.</CardDescription>
          </CardHeader>
          <CardContent className="dashboard-panel-card-content dashboard-personalization-key-card">
            <div className="dashboard-personalization-readout">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Default Online Key</p>
                <p className="mt-2 font-display text-5xl uppercase tracking-[0.2em] text-primary">{preferredKey ? preferredKey.toUpperCase() : "--"}</p>
              </div>
            </div>

            <section className="dashboard-preferred-keyboard" aria-label="Preferred online key picker">
              <div className="dashboard-preferred-keyboard__header">
                <span>Preferred Buzzer Matrix</span>
                <span>{preferredKey ? `${preferredKey.toUpperCase()} armed` : "Select one key"}</span>
              </div>
              <div className="dashboard-preferred-keyboard__keys" role="group" aria-label="Allowed character keys">
                {PERSONALIZATION_KEYBOARD_ROWS.map((row, rowIndex) => (
                  <div key={`personalization-key-row-${rowIndex}`} className="dashboard-preferred-keyboard__row">
                    {row.map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={`dashboard-preferred-key ${preferredKey === key ? "dashboard-preferred-key--active" : ""}`}
                        onClick={() => choosePreferredKey(key)}
                        aria-pressed={preferredKey === key}
                      >
                        {key}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>

        <Card className="dashboard-panel-card dashboard-theme-picker-panel border-primary/25 bg-card/15 backdrop-blur-xl">
          <CardHeader className="dashboard-panel-card-header">
            <div className="dashboard-theme-header-row">
              <div>
                <CardTitle className="dashboard-card-glow-title dashboard-theme-command-title uppercase tracking-[0.08em]">THEME: COMMAND {activeThemeCommand.name}</CardTitle>
                <CardDescription>Choose your command deck identity.</CardDescription>
              </div>
              <Button type="button" size="sm" variant="outline" className="dashboard-theme-reset-button" onClick={resetThemeShade}>
                Reset to Default
              </Button>
            </div>
          </CardHeader>
          <CardContent className="dashboard-panel-card-content dashboard-theme-picker-card">
            <div className="dashboard-theme-indicators" aria-label="Selected theme indicators">
              {THEME_COMMANDS.map((command) => {
                const shadeColor = themeShadeSelections[command.id] || command.color;
                return (
                  <Tooltip key={`theme-indicator-${command.id}`} className="dashboard-theme-tooltip">
                    <TooltipTrigger>
                      <button
                        type="button"
                        className={`dashboard-theme-indicator ${themeCommand === command.id ? "dashboard-theme-indicator--active" : ""}`}
                        style={{ "--dashboard-theme-option-color": shadeColor } as CSSProperties}
                        onClick={() => chooseThemeCommand(command.id)}
                        aria-label={`Select ${command.name} theme`}
                      />
                    </TooltipTrigger>
                    <TooltipContent className="dashboard-theme-tooltip__content">{command.name}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <Tabs className="dashboard-theme-tabs">
              <TabsList className="dashboard-theme-tabs__list" aria-label="Theme command tabs">
                {THEME_COMMANDS.map((command) => {
                  const shadeColor = themeShadeSelections[command.id] || command.color;
                  return (
                    <TabsTrigger
                      key={`theme-tab-${command.id}`}
                      type="button"
                      active={themeCommand === command.id}
                      className={`dashboard-theme-tab ${hoveredThemeCommand === command.id && themeCommand !== command.id ? "dashboard-theme-tab--preview" : ""}`}
                      style={{ "--dashboard-theme-option-color": shadeColor } as CSSProperties}
                      onClick={() => chooseThemeCommand(command.id)}
                    >
                      {command.name}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {THEME_COMMANDS.map((command) => {
                const color = themeCommand === command.id ? customThemeColor : command.color;
                return (
                  <TabsContent key={`theme-panel-${command.id}`} active={themeCommand === command.id}>
                    <div className={`dashboard-theme-option dashboard-theme-option--${command.id} dashboard-theme-option--active`} style={{ "--dashboard-theme-option-color": color } as CSSProperties}>
                      <div>
                        <span>{command.name}</span>
                        <small>{command.protocol}</small>
                      </div>
                      <strong className="dashboard-theme-option__hex">{color}</strong>
                    </div>
                    <HexColorPicker
                      activeOwner={themeCommand}
                      allowedColors={activeThemeShadeColors}
                      ariaLabel={`${command.name} hex color picker`}
                      className="dashboard-theme-color-picker"
                      getColorOwner={getColorOwner}
                      onColorHover={onThemeColorHover}
                      onUnavailableColorSelect={chooseThemeFromBlockedColor}
                      replacementColors={THEME_COMMANDS.map((themeCommandOption) => themeCommandOption.color)}
                      value={customThemeColor}
                      onChange={chooseThemeColor}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
