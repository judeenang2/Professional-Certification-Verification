;; Credential Issuance Contract
;; This contract handles the issuance and management of professional credentials

;; Define data variables
(define-data-var contract-owner principal tx-sender)
(define-map credentials
  { credential-id: (string-ascii 64) }
  {
    recipient: principal,
    authority-id: (string-ascii 64),
    credential-type: (string-ascii 100),
    issue-date: uint,
    expiry-date: uint,
    status: (string-ascii 20),
    metadata: (string-ascii 256)
  }
)

;; Define error codes
(define-constant ERR_UNAUTHORIZED u1)
(define-constant ERR_ALREADY_EXISTS u2)
(define-constant ERR_NOT_FOUND u3)
(define-constant ERR_INVALID_STATUS u4)
(define-constant ERR_INVALID_AUTHORITY u5)

;; Read-only functions
(define-read-only (get-contract-owner)
  (var-get contract-owner)
)

(define-read-only (get-credential (credential-id (string-ascii 64)))
  (map-get? credentials { credential-id: credential-id })
)

;; Direct implementation to avoid circular dependencies
(define-read-only (get-credentials-by-recipient (recipient principal))
  (filter credentials-map
    (lambda (entry)
      (is-eq (get recipient (get value entry)) recipient)
    )
  )
)

(define-read-only (is-credential-valid (credential-id (string-ascii 64)))
  (match (map-get? credentials { credential-id: credential-id })
    credential (and
                (is-eq (get status credential) "active")
                (< block-height (get expiry-date credential))
               )
    false
  )
)

;; Public functions
(define-public (issue-credential
    (credential-id (string-ascii 64))
    (recipient principal)
    (authority-id (string-ascii 64))
    (credential-type (string-ascii 100))
    (expiry-date uint)
    (metadata (string-ascii 256))
  )
  (let
    (
      (caller tx-sender)
    )
    ;; Check if the caller is authorized (contract owner or an active authority)
    (asserts! (or
                (is-eq caller (var-get contract-owner))
                (contract-call? .authority is-authority-active authority-id)
              )
              (err ERR_UNAUTHORIZED))

    ;; Check if the credential already exists
    (asserts! (is-none (map-get? credentials { credential-id: credential-id })) (err ERR_ALREADY_EXISTS))

    ;; Issue the credential
    (map-set credentials
      { credential-id: credential-id }
      {
        recipient: recipient,
        authority-id: authority-id,
        credential-type: credential-type,
        issue-date: block-height,
        expiry-date: expiry-date,
        status: "active",
        metadata: metadata
      }
    )
    (ok true)
  )
)

(define-public (update-credential-status
    (credential-id (string-ascii 64))
    (new-status (string-ascii 20))
  )
  (let
    (
      (caller tx-sender)
    )
    ;; Check if the caller is authorized
    (asserts! (is-eq caller (var-get contract-owner)) (err ERR_UNAUTHORIZED))

    ;; Check if the status is valid
    (asserts! (or (is-eq new-status "active") (is-eq new-status "suspended") (is-eq new-status "revoked")) (err ERR_INVALID_STATUS))

    ;; Update the credential status
    (match (map-get? credentials { credential-id: credential-id })
      credential (begin
        (map-set credentials
          { credential-id: credential-id }
          (merge credential {
            status: new-status
          })
        )
        (ok true)
      )
      (err ERR_NOT_FOUND)
    )
  )
)

(define-public (renew-credential
    (credential-id (string-ascii 64))
    (new-expiry-date uint)
  )
  (let
    (
      (caller tx-sender)
    )
    ;; Check if the caller is authorized
    (asserts! (is-eq caller (var-get contract-owner)) (err ERR_UNAUTHORIZED))

    ;; Update the credential expiry date
    (match (map-get? credentials { credential-id: credential-id })
      credential (begin
        (map-set credentials
          { credential-id: credential-id }
          (merge credential {
            expiry-date: new-expiry-date
          })
        )
        (ok true)
      )
      (err ERR_NOT_FOUND)
    )
  )
)

;; Initialize contract
(define-private (initialize)
  (var-set contract-owner tx-sender)
)

(initialize)

