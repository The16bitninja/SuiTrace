#[test_only]
module suitrace::trace_log_tests {
    use sui::test_scenario;
    use suitrace::trace_log;

    const AGENT: address = @0xCAFE;

    // ── Helpers ───────────────────────────────────────────────────────────────

    fun zero_hash(): vector<u8> {
        let mut h = vector[];
        let mut i = 0u64;
        while (i < 32) {
            h.push_back(0u8);
            i = i + 1;
        };
        h
    }

    fun fake_hash(seed: u8): vector<u8> {
        let mut h = vector[];
        let mut i = 0u64;
        while (i < 32) {
            h.push_back(seed);
            i = i + 1;
        };
        h
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    // Genesis record with correct inputs must succeed and be retrievable.
    #[test]
    fun test_genesis_record_succeeds() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);

            assert!(!trace_log::has_history(&registry, AGENT), 0);

            trace_log::record_decision(
                &mut registry,
                b"blob_0",
                fake_hash(0xAA),
                zero_hash(),
                0, 87, 97,
                b"HOLD",
                test_scenario::ctx(&mut scenario),
            );

            assert!(trace_log::has_history(&registry, AGENT), 1);
            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // Two sequential records with matching prev_hash chain must both succeed.
    #[test]
    fun test_sequential_records_succeed() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);
            let hash_0 = fake_hash(0xAA);

            trace_log::record_decision(
                &mut registry,
                b"blob_0", hash_0, zero_hash(),
                0, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );
            trace_log::record_decision(
                &mut registry,
                b"blob_1", fake_hash(0xBB), hash_0,
                1, 88, 98, b"BUY",
                test_scenario::ctx(&mut scenario),
            );

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // Skipping a seq_num (0 to 2) must abort with EBadSeqNum.
    #[test]
    #[expected_failure(abort_code = trace_log::EBadSeqNum)]
    fun test_skipped_seq_num_aborts() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);
            let hash_0 = fake_hash(0xAA);

            trace_log::record_decision(
                &mut registry,
                b"blob_0", hash_0, zero_hash(),
                0, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );
            // seq_num=2 when head is seq=0, must abort
            trace_log::record_decision(
                &mut registry,
                b"blob_2", fake_hash(0xCC), hash_0,
                2, 88, 98, b"SKIP",
                test_scenario::ctx(&mut scenario),
            );

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // Correct seq_num but wrong prev_hash must abort with EBadPrevHash.
    #[test]
    #[expected_failure(abort_code = trace_log::EBadPrevHash)]
    fun test_wrong_prev_hash_aborts() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);

            trace_log::record_decision(
                &mut registry,
                b"blob_0", fake_hash(0xAA), zero_hash(),
                0, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );
            // prev_hash is 0xFF...FF instead of 0xAA...AA, must abort
            trace_log::record_decision(
                &mut registry,
                b"blob_1", fake_hash(0xBB), fake_hash(0xFF),
                1, 88, 98, b"BUY",
                test_scenario::ctx(&mut scenario),
            );

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // First record with seq_num != 0 must abort with EBadSeqNum.
    #[test]
    #[expected_failure(abort_code = trace_log::EBadSeqNum)]
    fun test_genesis_nonzero_seq_aborts() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);

            // First record must be seq=0; seq=1 must abort
            trace_log::record_decision(
                &mut registry,
                b"blob_1", fake_hash(0xAA), zero_hash(),
                1, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // First record with non-zero prev_hash must abort with EBadPrevHash.
    #[test]
    #[expected_failure(abort_code = trace_log::EBadPrevHash)]
    fun test_genesis_nonzero_prev_hash_aborts() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);

            // Genesis prev_hash must be all zeros; 0x01...01 must abort
            trace_log::record_decision(
                &mut registry,
                b"blob_0", fake_hash(0xAA), fake_hash(0x01),
                0, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // get_head returns the correct seq_num and epoch after a genesis record.
    #[test]
    fun test_get_head_after_genesis() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);

            trace_log::record_decision(
                &mut registry,
                b"blob_0", fake_hash(0xAA), zero_hash(),
                0, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );

            let head = trace_log::get_head(&registry, AGENT);
            assert!(trace_log::record_seq_num(&head) == 0, 0);
            assert!(trace_log::record_certified_epoch(&head) == 87, 1);
            assert!(trace_log::record_end_epoch(&head) == 97, 2);
            assert!(trace_log::record_content_hash(&head) == fake_hash(0xAA), 3);

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // get_record retrieves a specific decision by seq_num.
    #[test]
    fun test_get_record_by_seq_num() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);

            trace_log::record_decision(
                &mut registry,
                b"blob_0", fake_hash(0xAA), zero_hash(),
                0, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );

            let r = trace_log::get_record(&registry, AGENT, 0);
            assert!(trace_log::record_seq_num(&r) == 0, 0);
            assert!(trace_log::record_content_hash(&r) == fake_hash(0xAA), 1);
            assert!(trace_log::record_certified_epoch(&r) == 87, 2);

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // Writing seq=1 must not destroy the seq=0 record; both must be retrievable.
    // This is the key test: with head-only storage, seq=0 would be gone after seq=1.
    #[test]
    fun test_history_preserves_old_records() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);
            let hash_0 = fake_hash(0xAA);
            let hash_1 = fake_hash(0xBB);

            trace_log::record_decision(
                &mut registry,
                b"blob_0", hash_0, zero_hash(),
                0, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );
            trace_log::record_decision(
                &mut registry,
                b"blob_1", hash_1, hash_0,
                1, 88, 98, b"BUY",
                test_scenario::ctx(&mut scenario),
            );

            // seq=0 must still be retrievable with its original values
            let r0 = trace_log::get_record(&registry, AGENT, 0);
            assert!(trace_log::record_seq_num(&r0) == 0, 0);
            assert!(trace_log::record_content_hash(&r0) == hash_0, 1);
            assert!(trace_log::record_certified_epoch(&r0) == 87, 2);

            // seq=1 must also be retrievable
            let r1 = trace_log::get_record(&registry, AGENT, 1);
            assert!(trace_log::record_seq_num(&r1) == 1, 3);
            assert!(trace_log::record_content_hash(&r1) == hash_1, 4);
            assert!(trace_log::record_certified_epoch(&r1) == 88, 5);

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // get_head and get_record(latest seq) must agree.
    #[test]
    fun test_get_record_matches_get_head() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);
            let hash_0 = fake_hash(0xAA);

            trace_log::record_decision(
                &mut registry,
                b"blob_0", hash_0, zero_hash(),
                0, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );
            trace_log::record_decision(
                &mut registry,
                b"blob_1", fake_hash(0xBB), hash_0,
                1, 88, 98, b"BUY",
                test_scenario::ctx(&mut scenario),
            );

            let head = trace_log::get_head(&registry, AGENT);
            let r1   = trace_log::get_record(&registry, AGENT, 1);
            assert!(trace_log::record_seq_num(&head) == trace_log::record_seq_num(&r1), 0);
            assert!(trace_log::record_content_hash(&head) == trace_log::record_content_hash(&r1), 1);

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }

    // get_head tracks the latest record, not the genesis record.
    #[test]
    fun test_get_head_returns_latest() {
        let mut scenario = test_scenario::begin(AGENT);
        {
            trace_log::init_for_testing(test_scenario::ctx(&mut scenario));
        };
        test_scenario::next_tx(&mut scenario, AGENT);
        {
            let mut registry = test_scenario::take_shared<trace_log::AgentRegistry>(&scenario);
            let hash_0 = fake_hash(0xAA);

            trace_log::record_decision(
                &mut registry,
                b"blob_0", hash_0, zero_hash(),
                0, 87, 97, b"HOLD",
                test_scenario::ctx(&mut scenario),
            );
            trace_log::record_decision(
                &mut registry,
                b"blob_1", fake_hash(0xBB), hash_0,
                1, 88, 98, b"BUY",
                test_scenario::ctx(&mut scenario),
            );

            let head = trace_log::get_head(&registry, AGENT);
            assert!(trace_log::record_seq_num(&head) == 1, 0);
            assert!(trace_log::record_certified_epoch(&head) == 88, 1);
            assert!(trace_log::record_content_hash(&head) == fake_hash(0xBB), 2);

            test_scenario::return_shared(registry);
        };
        test_scenario::end(scenario);
    }
}
