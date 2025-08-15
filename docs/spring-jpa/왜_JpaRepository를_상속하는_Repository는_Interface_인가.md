# 왜 JpaRepository 를 상속하는 Repository 는 Interface 인가

Spring에서 데이터베이스 연결하고 조회하는 로직을 ORM (Spring Data JPA) 사용해서 작성중이었음

NestJS + TypeORM 에서는 Repository 레이어를 따로 생성하지 않고 바로 서비스 레이어에서 주입해서 Spring 에서도 비슷하게 하면될줄알았는데 아니었음

```ts
@Injectable()
export class MyService {
    constructor(
        @InjectRepository(MyModel)
        public readonly myRepository: Repository<MyModel>;
    ) {}
}
```

Spring Data JPA 에서는 Repository Layer를 따로 생성해주어야 함

```java
public class MyRepository extends JpaRepository<MyModel, PK_Type> {
}
```

Spring 에서는 **인터페이스 기반 프로그래밍**, **런타임 코드 생성 설계 패턴**을 사용해서 개발자가 DAO 계층 구현 코드를 작성하지 않도록 하는 설계철학 때문임

## 그럼 Spring Data JPA 에서 Repository 는 어떤 단계를 거쳐서 런타임에 코드가 생성되나

1. 인터페이스 정의

    - `JpaRepository` 상속하는 `MyRepository` 가 있을 때 이 `MyRepository` 는 `MyModel` 엔티티에 대한 데이터페이스 작업을 처리하는 계약 Contract 역할을 함.
    - 이때 여기서는 아무 메서드도 구현하지 않음

2. 메타데이터 추출

    - 이 단계는 스프링 컨테이너가 빈을 생성, 초기화하는 시점에 진행됨
    - Spring 애플리케이션이 실행될 때, Spring Data JPA 는 `MyRepository` 인터페이스를 스캔하고 분석함 (SpringBoot 에서 `@EnableJpaRepositories`에서 자동설정 되어있음)
    - `JpaRepository` 상속하는걸 데이터 저장소로 인식, 제네릭 타입으로 엔티티와 기본키 타입 유추, 메서드 시그니처에 맞는 쿼리가 필요하겠구나! 하고 인식함

> 메타데이터는 어케추출하노
>
> -   `MyRepository.class` 인터페이스 정보를 리플렉션으로 가져옴 (메타프로그래밍. ts 에 reflect-metadata 랑 비슷한듯)
> -   메서드 시그니처 (이름) 분석해서 조회쿼리인지 삽입쿼리인지 ... 를 결정함
> -   메서드 인자타입, 반환타입 분석해서 쿼리 조건결과를 저장함
> -   `JpaRepository<Model, Type>` 제네릭 타입정보로 Model 클래스를 분석하고, 해당 Model 클래스에 `@Column`, `@Id` 같은 어노테이션이 붙어있는지 확인하고, DB 테이블과 Column 매핑함 (이거 일치안하면 런타임, 빈초기화 시점에 `BeanCreationException` 터짐)

3. 프록시 Proxy 구현체 동적으로 생성함

    - `MyRepository` 인터페이스 구현하는 Proxy 클래스를 메모리에서 동적으로 생성함
    - `findAll()`, `findById()` 와 같은 기본 메서드 + 개발자가 인터페이스에 정의한 메서드 시그니처에 맞는 JPQL 쿼리 까지 포함됨

4. DI 컨테이너에 등록
    - 동적으로 생성된 구현체를 Bean 에 등록하고 `@Autowired` 나 생성자 주입을 통해 객체를 주입함

## 메서드 시그니처 어떤 패턴으로 작성해야함 ?

1. 기본 조회 (find, read, get, query)

    - `findBy<필드명>()`
    - 예. `findById()`

2. 복합 조건: 두개 이상필드 결합해서 조건 만들때 (And, Or)

    - `findBy<필드명1>And<필드명2>`
        - 예. `findByEmailAndName()`
    - `findBy<필드명1>Or<필드명2>`
        - 예. `findByEmailOrName()`

3. 정렬 및 개수제한 (OrderBy, Top, First)

    - `findBy<조건>OrderBy<필드명>Asc/Desc()`
        - 예. `findByAgeOrderByEmailAsc(int age)` - age가 일치하는 유저들을 email 기준 오름차순 정렬
    - `findTop<숫자>By<조건>()`
        - 예. `findTop3ByAge(int age)` - age가 일치하는 유저들 중 상위 3명 조회
    - `findFirstBy<조건>()`
        - 예. `findFirstByAge(int age)` - age가 일치하는 첫 번째 유저 조회

4. 조건 연산자 (GreaterThan, LessThan, Like, Between)

    - `findBy<필드명>GreaterThan()`
        - 예. `findByAgeGreaterThan(int age)` - age가 주어진 값보다 큰 유저들
    - `findBy<필드명>LessThan()`
        - 예. `findByAgeLessThan(int age)` - age가 주어진 값보다 작은 유저들
    - `findBy<필드명>Containing()`
        - 예. `findByNameContaining(String keyword)` - name에 keyword가 포함된 유저들 (LIKE '%keyword%')
    - `findBy<필드명>StartingWith()`
        - 예. `findByNameStartingWith(String prefix)` - name이 prefix로 시작하는 유저들 (LIKE 'prefix%')
    - `findBy<필드명>EndingWith()`
        - 예. `findByNameEndingWith(String suffix)` - name이 suffix로 끝나는 유저들 (LIKE '%suffix')
    - `findBy<필드명>Between()`
        - 예. `findByAgeBetween(int startAge, int endAge)` - age가 두 값 사이에 있는 유저들

5. Null 체크 (IsNull, IsNotNull)

    - `findBy<필드명>IsNull()`
        - 예. `findByEmailIsNull()` - email이 null인 유저들
    - `findBy<필드명>IsNotNull()`
        - 예. `findByEmailIsNotNull()` - email이 null이 아닌 유저들

6. 집계 함수 (Count, Exists)

    - `countBy<조건>()`
        - 예. `countByAgeGreaterThan(int age)` - age가 주어진 값보다 큰 유저의 수
    - `existsBy<조건>()`
        - 예. `existsByEmail(String email)` - 해당 email을 가진 유저가 존재하는지 여부

7. 페이징 및 동적 정렬 (Pageable)
    - `findBy<조건>(Pageable pageable)`
        - 예. `findByAge(int age, Pageable pageable)` - age가 일치하는 유저를 페이징하여 조회
    - `Page<엔티티>` 또는 `Slice<엔티티>` 반환타입 사용

## 간단한 예시

```java
public interface UserRepository extends JpaRepository<User, Long> {
    // 기본 조회
    List<User> findByEmail(String email);
    Optional<User> findById(Long id);

    // 복합 조건
    List<User> findByEmailAndName(String email, String name);
    List<User> findByAgeOrStatus(int age, String status);

    // 정렬 및 개수 제한
    List<User> findByAgeOrderByEmailAsc(int age);
    List<User> findTop3ByAge(int age);
    User findFirstByOrderByCreatedAtDesc();

    // 조건 연산자
    List<User> findByAgeGreaterThan(int age);
    List<User> findByNameContaining(String keyword);
    List<User> findByAgeBetween(int startAge, int endAge);

    // Null 체크
    List<User> findByEmailIsNull();
    List<User> findByPhoneIsNotNull();

    // 집계 함수
    long countByAgeGreaterThan(int age);
    boolean existsByEmail(String email);

    // 페이징
    Page<User> findByAge(int age, Pageable pageable);
}
```
