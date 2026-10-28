# Protocol

Train sessions and held-out sessions are drawn from disjoint seeds before any rule is scored.

The exploit strategy sees the public book, public news, its own inventory, and a reference it builds from those. It does not receive the hidden value or any private signal.

Several pre-specified rule variants are scored by mean terminal PnL on the train seeds only. The variant with the highest train mean is frozen. Held-out seeds are then run once with that frozen variant. Test PnL is not an input to the choice.

Terminal PnL marks leftover inventory to the hidden value at the end of the session. That is an accounting identity inside the simulation.

Falsification replays the frozen rules under a changed model, temperature, prompt, noise, cost, position limit, agent count, or seed. Rules are not re-selected. If the bootstrap interval for mean PnL does not lie above zero, the cell is reported as not surviving.

The prompt `v1-debias` adds the instruction: "Beware of round-number anchoring."

Mock models are deterministic behavioral simulators used so the lab can run without paid API calls. They are not production language models.
