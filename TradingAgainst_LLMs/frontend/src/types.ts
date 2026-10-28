export type Ci = { mean?: number | null; low: number | null; high: number | null; n?: number };

export type SessionSummary = {
  id: string;
  split: string;
  seed: number;
  strategy_pnl_vs_truth: number | null;
  strategy_pnl_vs_mid: number | null;
  max_drawdown: number | null;
  terminal_true_value: number | null;
  initial_true_value: number | null;
  final_mid: number | null;
  n_trades: number;
  n_news: number;
  parse_failures: number;
  curve: number[];
  path: Array<{
    round: number;
    true_value: number;
    midpoint: number | null;
    best_bid: number | null;
    best_ask: number | null;
    spread: number | null;
    news_event: string;
    news_magnitude: number;
    volume: number;
  }>;
  rule_counts: Record<string, number>;
  agent_terminal: Record<string, number>;
};

export type BiasTest = {
  id: string;
  title: string;
  null_hypothesis: string;
  alternative: string;
  n: number;
  statistic_name: string | null;
  statistic: number | null;
  p_value: number | null;
  effect_size_name: string | null;
  effect_size: number | null;
  ci95: { estimate_name: string | null; estimate: number | null; low: number | null; high: number | null };
  insufficient_data: boolean;
  interpretation: string;
  series: {
    excess_proximity?: { counts: number[]; edges: number[] };
    gap?: { counts: number[]; edges: number[] };
    scatter?: Array<{ half_spread: number; abs_error: number }>;
    horizons?: Array<{ horizon: number; n: number; mean_adjustment: number | null; ci95_low: number | null; ci95_high: number | null }>;
  };
  extra?: Record<string, unknown>;
};

export type PerformanceBlock = {
  split: string;
  label: string;
  n_sessions: number;
  total_pnl: number;
  mean_pnl: number | null;
  median_pnl: number | null;
  win_rate: number | null;
  loss_rate: number | null;
  win_rate_definition: string;
  profitable_sessions: number;
  losing_sessions: number;
  flat_sessions: number;
  max_drawdown_worst_session: number | null;
  mean_session_max_drawdown: number | null;
  drawdown_definition: string;
  student_ci95: Ci;
  bootstrap_ci95: Ci;
  histogram: { counts: number[]; edges: number[] };
  session_pnls: Array<{ id: string; seed: number; split: string; pnl: number; max_drawdown: number }>;
};

export type ExperimentBundle = {
  id: string;
  name: string;
  created_at: string;
  engine_version: string;
  cached: boolean;
  estimated_model_calls: number;
  disclaimer: string;
  config: Record<string, unknown>;
  protocol: {
    train_seeds: number[];
    test_seeds: number[];
    prompt_seeds: number[];
    selection_metric: string;
    variants: Array<{ name: string; mean_pnl: number; params: Record<string, unknown> }>;
    frozen_variant: string;
    frozen_params: Record<string, unknown>;
    test_used_for_selection: boolean;
    provider: string;
    model: string;
    oracle: boolean;
  };
  performance: { train: PerformanceBlock; test: PerformanceBlock };
  biases: { train: BiasTest[]; test: BiasTest[] };
  prompt_sensitivity: {
    n_pairs: number;
    insufficient_data: boolean;
    interpretation: string;
    mean_abs_quote_delta?: number;
    quote_delta_p_value?: number | null;
    mean_agent_pnl_delta?: number;
    pnl_delta_p_value?: number | null;
    mean_trade_count_delta?: number;
    quote_delta_ci95?: { low: number | null; high: number | null };
    pnl_delta_ci95?: { low: number | null; high: number | null };
  } | null;
  sessions: SessionSummary[];
};

export type ExperimentListItem = {
  id: string;
  name: string;
  created_at: string;
  status: string;
  provider: string;
  model: string;
  frozen_variant: string;
  test_mean_pnl: number | null;
  test_ci_low: number | null;
  test_ci_high: number | null;
  train_sessions: number;
  test_sessions: number;
  rounds: number;
  agents: number;
  seed: number;
};

export type BookLevel = { price: number; size: number; orders: number; agent_ids: string[] };

export type SessionDetail = {
  id: string;
  split: string;
  seed: number;
  oracle: boolean;
  hidden_variables: number[];
  initial_true_value: number;
  terminal_true_value: number;
  final_mid: number | null;
  strategy_terminal_pnl: number;
  strategy_terminal_pnl_vs_mid: number | null;
  strategy_max_drawdown: number;
  strategy_curve: number[];
  agent_terminal: Record<string, number>;
  parse_failures: number;
  n_trades: number;
  n_news: number;
  rounds: Array<{
    round: number;
    true_value: number;
    vol_shock: number;
    news_event: string;
    news_magnitude: number;
    book: {
      bids: BookLevel[];
      asks: BookLevel[];
      best_bid: number | null;
      best_ask: number | null;
      best_bid_size: number;
      best_ask_size: number;
      midpoint: number | null;
      spread: number | null;
      bid_depth: number;
      ask_depth: number;
    };
    trades: Array<{
      buyer_id: string;
      seller_id: string;
      price: number;
      quantity: number;
      round: number;
      aggressor_side: string;
    }>;
    quotes: Array<{
      agent_id: string;
      model: string;
      temperature: number;
      persona: string;
      prompt_version: string;
      private_signal: number;
      signal_error: number;
      bid: number | null;
      ask: number | null;
      size: number | null;
      accepted: boolean;
      inventory: number;
      cash: number;
      pnl_vs_mid: number | null;
      error: string | null;
    }>;
    portfolios: Record<string, { cash: number; inventory: number; pnl_vs_mid: number | null; pnl_vs_truth: number }>;
    strategy: {
      round: number;
      rule_triggered: string;
      input_state: Record<string, unknown>;
      action: string;
      price: number | null;
      quantity: number;
      expected_edge: number;
      realized_pnl: number | null;
    } | null;
  }>;
};

export type SystemInfo = {
  version: string;
  engine_version: string;
  provider: string;
  api_key_configured: boolean;
  openai_base_url: string;
  openai_model: string;
  ollama_base_url: string;
  ollama_model: string;
  max_concurrency: number;
  max_output_tokens: number;
  max_retries: number;
  database: string;
  available_providers: string[];
  available_models: string[];
  agent_types: string[];
  prompt_versions: string[];
  default_experiment: Record<string, unknown>;
  disclaimer: string;
};

export type Falsification = {
  experiment_id?: string;
  retuned?: boolean;
  frozen_variant?: string;
  disclaimer?: string;
  baseline_test?: PerformanceBlock;
  cells: Array<{
    id: string;
    label: string;
    n_sessions: number;
    mean_pnl: number | null;
    bootstrap_ci95: Ci;
    win_rate: number | null;
    anchoring_p_value: number | null;
    anchoring_effect: number | null;
    pnl_survives: boolean;
    bias_survives: boolean;
    interpretation: string;
    max_drawdown_worst_session: number | null;
  }>;
};
