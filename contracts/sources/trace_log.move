module suitrace::trace_log {
    use sui::table::{Self, Table};
    use sui::event;

    // ── Error codes ───────────────────────────────────────────────────────────

    // Sequence number is not head.seq_num + 1 (or not 0 for genesis).
    const EBadSeqNum: u64 = 0;
    // prev_hash does not match head.content_hash (or not zero for genesis).
    const EBadPrevHash: u64 = 1;

    // ── Data structures ───────────────────────────────────────────────────────

    public struct AgentRegistry has key {
        id: UID,
        heads:   Table<address, DecisionRecord>,
        // Full history indexed by (agent, seq_num). Walrus chain traversal
        // no longer requires Walrus to be reachable — metadata verification
        // can happen against on-chain records alone.
        history: Table<address, Table<u64, DecisionRecord>>,
    }

    public struct DecisionRecord has store, copy, drop {
        agent: address,
        seq_num: u64,
        blob_id: vector<u8>,
        content_hash: vector<u8>,
        prev_hash: vector<u8>,
        certified_epoch: u64,
        end_epoch: u64,
        decision_summary: vector<u8>,
    }

    // Emitted on every successful record_decision call; enables off-chain indexing.
    public struct DecisionLogged has copy, drop {
        agent: address,
        seq_num: u64,
        blob_id: vector<u8>,
        content_hash: vector<u8>,
        certified_epoch: u64,
    }

    // ── Init ──────────────────────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        transfer::share_object(AgentRegistry {
            id:      object::new(ctx),
            heads:   table::new(ctx),
            history: table::new(ctx),
        });
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx)
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    public fun record_decision(
        registry: &mut AgentRegistry,
        blob_id: vector<u8>,
        content_hash: vector<u8>,
        prev_hash: vector<u8>,
        seq_num: u64,
        certified_epoch: u64,
        end_epoch: u64,
        summary: vector<u8>,
        ctx: &mut TxContext,
    ) {
        let agent = ctx.sender();

        if (table::contains(&registry.heads, agent)) {
            let head = table::borrow(&registry.heads, agent);
            assert!(seq_num == head.seq_num + 1, EBadSeqNum);
            assert!(prev_hash == head.content_hash, EBadPrevHash);
        } else {
            // Genesis: must start at seq 0 with an all-zero prev_hash.
            assert!(seq_num == 0, EBadSeqNum);
            assert!(is_zero_hash(&prev_hash), EBadPrevHash);
        };

        let record = DecisionRecord {
            agent,
            seq_num,
            blob_id,
            content_hash,
            prev_hash,
            certified_epoch,
            end_epoch,
            decision_summary: summary,
        };

        // Emit before consuming the record (copy ability lets this compile cleanly).
        event::emit(DecisionLogged {
            agent,
            seq_num,
            blob_id: record.blob_id,
            content_hash: record.content_hash,
            certified_epoch,
        });

        // Update head (latest record for fast lookup).
        if (table::contains(&registry.heads, agent)) {
            *table::borrow_mut(&mut registry.heads, agent) = record;
        } else {
            table::add(&mut registry.heads, agent, record);
        };

        // Append to full history so any seq_num is retrievable on-chain.
        // Chain verification no longer requires Walrus to be reachable.
        if (!table::contains(&registry.history, agent)) {
            table::add(&mut registry.history, agent, table::new(ctx));
        };
        table::add(table::borrow_mut(&mut registry.history, agent), seq_num, record);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    public fun has_history(registry: &AgentRegistry, agent: address): bool {
        table::contains(&registry.heads, agent)
    }

    public fun get_head(registry: &AgentRegistry, agent: address): DecisionRecord {
        *table::borrow(&registry.heads, agent)
    }

    // Returns a specific historical record by seq_num without needing Walrus.
    public fun get_record(registry: &AgentRegistry, agent: address, seq_num: u64): DecisionRecord {
        let agent_history = table::borrow(&registry.history, agent);
        *table::borrow(agent_history, seq_num)
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public fun record_agent(r: &DecisionRecord): address            { r.agent }
    public fun record_seq_num(r: &DecisionRecord): u64              { r.seq_num }
    public fun record_blob_id(r: &DecisionRecord): vector<u8>       { r.blob_id }
    public fun record_content_hash(r: &DecisionRecord): vector<u8>  { r.content_hash }
    public fun record_prev_hash(r: &DecisionRecord): vector<u8>     { r.prev_hash }
    public fun record_certified_epoch(r: &DecisionRecord): u64      { r.certified_epoch }
    public fun record_end_epoch(r: &DecisionRecord): u64            { r.end_epoch }
    public fun record_decision_summary(r: &DecisionRecord): vector<u8> { r.decision_summary }

    // ── Internal helpers ──────────────────────────────────────────────────────

    fun is_zero_hash(hash: &vector<u8>): bool {
        let len = hash.length();
        if (len != 32) return false;
        let mut i = 0;
        while (i < len) {
            if (*hash.borrow(i) != 0u8) return false;
            i = i + 1;
        };
        true
    }
}
