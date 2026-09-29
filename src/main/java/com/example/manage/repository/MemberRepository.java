package com.example.manage.repository;

import com.example.manage.domain.Member;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// Entity가 Member, PK는 Long
public interface MemberRepository extends JpaRepository<Member, Long> {

    // 로그인 시 사용
    Optional<Member> findByLoginId(String loginId);

    // 참가자 번호로 조회
    Optional<Member> findByParticipantNo(Integer participantNo);

    Optional<Member> findTopByOrderByParticipantNoDesc();
}
